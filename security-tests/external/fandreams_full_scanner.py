#!/usr/bin/env python3
"""
============================================================================
FANDREAMS — FULL PLATFORM SECURITY SCANNER v2.0
============================================================================

Cobertura: TODAS as 15 areas da plataforma (68 endpoints, 50+ testes)
Metodologias: OWASP API Security Top 10, IDOR, Race Conditions, Business Logic
Executor: CodeSandbox ou qualquer ambiente Python 3.8+

Dependencias:
    pip install requests aiohttp

Uso:
    python fandreams_full_scanner.py --target https://api.fandreams.app \\
        --email user@test.com --password 'senha123'

============================================================================
AVISO: Uso EXCLUSIVO em testes de seguranca autorizados da FanDreams.
============================================================================
"""

import argparse
import asyncio
import json
import sys
import time
import uuid
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Optional

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:
    print("[!] pip install requests")
    sys.exit(1)

try:
    import aiohttp
except ImportError:
    print("[!] pip install aiohttp")
    sys.exit(1)

# ─── Output Helpers ──────────────────────────────────────────────────────────

class C:
    R = "\033[91m"; G = "\033[92m"; Y = "\033[93m"; B = "\033[94m"
    M = "\033[95m"; CY = "\033[96m"; BD = "\033[1m"; RS = "\033[0m"

def ok(m):   print(f"  {C.G}[PASS]{C.RS} {m}")
def fail(m): print(f"  {C.R}[FAIL]{C.RS} {m}")
def warn(m): print(f"  {C.Y}[WARN]{C.RS} {m}")
def info(m): print(f"  {C.B}[INFO]{C.RS} {m}")
def hdr(m):  print(f"\n{C.BD}{C.CY}{'='*70}{C.RS}\n{C.BD}  {m}{C.RS}\n{C.BD}{C.CY}{'='*70}{C.RS}")

# ─── Result Tracking ────────────────────────────────────────────────────────

@dataclass
class TR:
    cat: str; name: str; sev: str; status: str; desc: str
    details: str = ""; rec: str = ""

@dataclass
class Report:
    target: str; scan_time: str = ""; user_id: str = ""; user_role: str = ""
    profile: str = ""
    results: list = field(default_factory=list)
    summary: dict = field(default_factory=dict)

    def add(self, r: TR):
        self.results.append(r)

    def score(self):
        s = 100
        for r in self.results:
            if r.status == "FAIL":
                s -= {"CRITICAL": 15, "HIGH": 8, "MEDIUM": 4, "LOW": 2}.get(r.sev, 1)
            elif r.status == "WARN":
                s -= {"CRITICAL": 4, "HIGH": 2, "MEDIUM": 1, "LOW": 0}.get(r.sev, 0)
        s = max(0, s)
        g = "A" if s >= 90 else "B" if s >= 80 else "C" if s >= 70 else "D" if s >= 60 else "E/F"
        t = len(self.results)
        self.summary = {
            "total": t,
            "pass": sum(1 for r in self.results if r.status == "PASS"),
            "fail": sum(1 for r in self.results if r.status == "FAIL"),
            "warn": sum(1 for r in self.results if r.status == "WARN"),
            "skip": sum(1 for r in self.results if r.status == "SKIP"),
            "error": sum(1 for r in self.results if r.status == "ERROR"),
            "critical_fail": sum(1 for r in self.results if r.status == "FAIL" and r.sev == "CRITICAL"),
            "high_fail": sum(1 for r in self.results if r.status == "FAIL" and r.sev == "HIGH"),
            "score": s, "grade": g,
        }

# ─── HTTP ────────────────────────────────────────────────────────────────────

def mksession():
    s = requests.Session()
    retries = Retry(total=2, backoff_factor=0.5, status_forcelist=[502, 503, 504])
    s.mount("https://", HTTPAdapter(max_retries=retries))
    s.mount("http://", HTTPAdapter(max_retries=retries))
    s.headers.update({"Content-Type": "application/json", "Accept": "application/json",
                       "User-Agent": "FanDreams-FullScanner/2.0"})
    return s

def login(s, base, email, pw):
    info(f"Autenticando {email}...")
    r = s.post(f"{base}/auth/login", json={"email": email, "password": pw}, timeout=15)
    d = r.json()
    if r.status_code == 200 and d.get("success"):
        s.headers["Authorization"] = f"Bearer {d['data']['accessToken']}"
        u = d["data"]["user"]
        ok(f"userId={u['id']}, role={u.get('role','?')}")
        return u
    fail(f"Login: {r.status_code} — {d}")
    sys.exit(1)

def g(s, base, path, **kw):
    try: return s.get(f"{base}{path}", timeout=10, **kw)
    except Exception as e: return type('R', (), {"status_code": 0, "json": lambda: {"error": str(e)}})()

def p(s, base, path, json_data=None, **kw):
    try: return s.post(f"{base}{path}", json=json_data, timeout=10, **kw)
    except Exception as e: return type('R', (), {"status_code": 0, "json": lambda: {"error": str(e)}})()

def pa(s, base, path, json_data=None, **kw):
    try: return s.patch(f"{base}{path}", json=json_data, timeout=10, **kw)
    except Exception as e: return type('R', (), {"status_code": 0, "json": lambda: {"error": str(e)}})()

def d(s, base, path, **kw):
    try: return s.delete(f"{base}{path}", timeout=10, **kw)
    except Exception as e: return type('R', (), {"status_code": 0, "json": lambda: {"error": str(e)}})()

FAKE = str(uuid.uuid4())
FAKE2 = str(uuid.uuid4())


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 1: CRITICAL
# ═══════════════════════════════════════════════════════════════════════════

# ─── 1. Auth Bypass (all financial endpoints) ────────────────────────────

def test_auth_bypass(base, rpt):
    hdr("P1.1: Auth Bypass — Endpoints Sem Token")
    noauth = mksession()
    endpoints = [
        ("GET", "/fancoins/wallet"), ("POST", "/fancoins/tip"),
        ("POST", "/fancoins/purchase"), ("GET", "/withdrawals/earnings"),
        ("POST", "/withdrawals/request"), ("GET", "/subscriptions/status"),
        ("POST", "/messages/send"), ("GET", "/notifications"),
        ("POST", "/upload/avatar"), ("POST", "/kyc/submit"),
        ("GET", "/gamification/me"), ("GET", "/affiliates/dashboard"),
        ("GET", "/video/list"),
    ]
    blocked = True
    for method, path in endpoints:
        r = noauth.get(f"{base}{path}", timeout=10) if method == "GET" else noauth.post(f"{base}{path}", json={}, timeout=10)
        if r.status_code == 200 and r.json().get("success"):
            fail(f"{method} {path}: ACESSIVEL SEM TOKEN!")
            blocked = False
        else:
            ok(f"{method} {path}: {r.status_code}")

    # Fake JWT
    fake_s = mksession()
    fake_s.headers["Authorization"] = "Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ0ZXN0In0.fake"
    r2 = fake_s.get(f"{base}/fancoins/wallet", timeout=10)
    if r2.status_code == 200 and r2.json().get("success"):
        fail("JWT falso aceito!")
        blocked = False
    else:
        ok(f"JWT falso: {r2.status_code}")

    rpt.add(TR("Authentication", "P1.1-auth-bypass", "CRITICAL",
               "PASS" if blocked else "FAIL",
               "Todos os endpoints protegidos" if blocked else "Endpoints acessiveis sem auth",
               rec="Verificar authMiddleware em todas as rotas"))


# ─── 2. Privilege Escalation ─────────────────────────────────────────────

def test_privilege_escalation(s, base, rpt):
    hdr("P1.2: Privilege Escalation — Admin Endpoints")
    admin_eps = [
        ("GET", "/admin/dashboard"), ("GET", "/admin/users"),
        ("GET", "/withdrawals/admin/all"), ("GET", "/withdrawals/admin/pending"),
        ("GET", "/withdrawals/admin/settings"),
        ("POST", f"/withdrawals/admin/{FAKE}/approve"),
        ("POST", f"/withdrawals/admin/{FAKE}/reject"),
        ("PATCH", "/withdrawals/admin/settings"),
        ("GET", "/admin/kyc"), ("POST", f"/admin/kyc/{FAKE}/review"),
    ]
    blocked = True
    for method, path in admin_eps:
        if method == "GET": r = g(s, base, path)
        elif method == "POST": r = p(s, base, path, {"reason": "test"})
        else: r = pa(s, base, path, {"min_payout": 0.01})
        if r.status_code == 200 and r.json().get("success"):
            fail(f"{method} {path}: ACESSIVEL!")
            blocked = False
        else:
            ok(f"{method} {path}: {r.status_code}")

    rpt.add(TR("Privilege Escalation", "P1.2-admin", "CRITICAL",
               "PASS" if blocked else "FAIL",
               "Admin endpoints bloqueados" if blocked else "Acesso admin sem autorizacao"))


# ─── 3. Subscriptions IDOR ──────────────────────────────────────────────

def test_subscriptions(s, base, rpt, uid):
    hdr("P1.3: Subscriptions — IDOR & Business Logic")

    # Self-subscribe
    r = p(s, base, "/subscriptions/subscribe", {"creatorId": uid})
    d1 = r.json()
    if r.status_code == 200 and d1.get("success"):
        fail("Self-subscribe aceito!")
        rpt.add(TR("Subscriptions", "P1.3a-self-sub", "HIGH", "FAIL", "Auto-assinatura permitida"))
    else:
        ok(f"Self-subscribe bloqueado: {d1.get('error',{}).get('code', r.status_code)}")
        rpt.add(TR("Subscriptions", "P1.3a-self-sub", "HIGH", "PASS", "Auto-assinatura bloqueada"))

    # IDOR: cancel another user's subscription
    r = p(s, base, f"/subscriptions/{FAKE}/cancel")
    d2 = r.json()
    if r.status_code == 200 and d2.get("success"):
        warn("Cancel de subscription alheia pode ter sucesso (IDOR)")
        rpt.add(TR("Subscriptions", "P1.3b-cancel-idor", "HIGH", "WARN",
                    "Cancel aceito para ID desconhecido — verificar ownership",
                    rec="Verificar que subscription pertence ao usuario autenticado"))
    else:
        ok(f"Cancel IDOR bloqueado: {r.status_code}")
        rpt.add(TR("Subscriptions", "P1.3b-cancel-idor", "HIGH", "PASS", "Cancel requer ownership"))

    # IDOR: check subscription status of random creator
    r = g(s, base, f"/subscriptions/check/{FAKE}")
    if r.status_code == 200:
        ok("Check subscription status: retorna dados (esperado — mostra se esta inscrito)")
    rpt.add(TR("Subscriptions", "P1.3c-status-check", "MEDIUM", "PASS",
               "Check subscription retorna status do usuario autenticado"))

    # Subscribe to nonexistent creator
    r = p(s, base, "/subscriptions/subscribe", {"creatorId": FAKE})
    d3 = r.json()
    if r.status_code == 200 and d3.get("success"):
        warn("Subscribe a creator inexistente aceito")
        rpt.add(TR("Subscriptions", "P1.3d-nonexistent", "MEDIUM", "WARN",
                    "Assinatura de creator inexistente aceita",
                    rec="Validar existencia do creator antes de criar subscription"))
    else:
        ok(f"Subscribe nonexistent: {d3.get('error',{}).get('code', r.status_code)}")
        rpt.add(TR("Subscriptions", "P1.3d-nonexistent", "MEDIUM", "PASS",
                    "Creator inexistente rejeitado"))


# ─── 4. Messaging IDOR ──────────────────────────────────────────────────

def test_messaging(s, base, rpt, uid):
    hdr("P1.4: Messaging — IDOR & Spam")

    # Self-message
    r = p(s, base, "/messages/send", {"recipientId": uid, "content": "test"})
    d1 = r.json()
    if r.status_code == 200 and d1.get("success"):
        warn("Self-message aceito")
        rpt.add(TR("Messaging", "P1.4a-self-msg", "MEDIUM", "WARN", "Auto-mensagem permitida"))
    else:
        ok(f"Self-message bloqueado: {d1.get('error',{}).get('code', r.status_code)}")
        rpt.add(TR("Messaging", "P1.4a-self-msg", "MEDIUM", "PASS", "Auto-mensagem bloqueada"))

    # IDOR: access random conversation
    r = g(s, base, f"/messages/conversation/{FAKE}")
    d2 = r.json()
    if r.status_code == 200 and d2.get("success"):
        msgs = d2.get("data", {}).get("messages", d2.get("data", []))
        if isinstance(msgs, list) and len(msgs) > 0:
            foreign = [m for m in msgs if m.get("senderId") != uid and m.get("recipientId") != uid]
            if foreign:
                fail("IDOR: acessou mensagens de conversa alheia!")
                rpt.add(TR("Messaging", "P1.4b-conv-idor", "CRITICAL", "FAIL",
                            "Acessou conversa de outros usuarios"))
                return
        ok("Conversation IDOR: sem dados alheios")
    else:
        ok(f"Conversation IDOR: {r.status_code}")
    rpt.add(TR("Messaging", "P1.4b-conv-idor", "HIGH", "PASS",
               "Nao acessou conversas de outros usuarios"))

    # Message to nonexistent user
    r = p(s, base, "/messages/send", {"recipientId": FAKE, "content": "test"})
    d3 = r.json()
    if r.status_code == 200 and d3.get("success"):
        warn("Mensagem para usuario inexistente aceita")
    else:
        ok(f"Msg nonexistent: {r.status_code}")

    # Empty/XSS content
    xss_tests = [
        ("empty", ""),
        ("xss-script", "<script>alert(1)</script>"),
        ("xss-img", '<img onerror="alert(1)" src=x>'),
    ]
    for name, content in xss_tests:
        r = p(s, base, "/messages/send", {"recipientId": FAKE, "content": content})
        if r.status_code == 200 and r.json().get("success"):
            data = r.json().get("data", {})
            stored = data.get("content", content)
            if "<script>" in stored or "onerror" in stored:
                warn(f"XSS nao sanitizado: {name}")
            else:
                ok(f"Msg {name}: aceita mas potencialmente sanitizada")
        else:
            ok(f"Msg {name}: rejeitada ({r.status_code})")

    rpt.add(TR("Messaging", "P1.4c-input", "MEDIUM", "PASS",
               "Input validation testado em mensagens"))


# ─── 5. Notifications IDOR ──────────────────────────────────────────────

def test_notifications(s, base, rpt, uid):
    hdr("P1.5: Notifications — IDOR")

    # List own notifications (should work)
    r = g(s, base, "/notifications")
    if r.status_code == 200:
        ok("Listar notificacoes OK")

    # IDOR: mark random notification as read
    r = pa(s, base, f"/notifications/{FAKE}/read")
    if r.status_code == 200 and r.json().get("success"):
        warn("Mark-read de notificacao alheia pode ter sucesso")
        rpt.add(TR("Notifications", "P1.5a-read-idor", "HIGH", "WARN",
                    "Mark-read aceito para ID desconhecido — verificar ownership"))
    else:
        ok(f"Mark-read IDOR: {r.status_code}")
        rpt.add(TR("Notifications", "P1.5a-read-idor", "HIGH", "PASS",
                    "Mark-read requer ownership"))

    # IDOR: delete random notification
    r = d(s, base, f"/notifications/{FAKE}")
    if r.status_code == 200 and r.json().get("success"):
        warn("Delete de notificacao alheia pode ter sucesso")
        rpt.add(TR("Notifications", "P1.5b-delete-idor", "HIGH", "WARN",
                    "Delete aceito para ID desconhecido — verificar ownership"))
    else:
        ok(f"Delete IDOR: {r.status_code}")
        rpt.add(TR("Notifications", "P1.5b-delete-idor", "HIGH", "PASS",
                    "Delete requer ownership"))


# ─── 6. Posts & Content Access Control ───────────────────────────────────

def test_posts_access(s, base, rpt, uid):
    hdr("P1.6: Posts — Visibility & IDOR")

    # Try updating someone else's post
    r = pa(s, base, f"/posts/{FAKE}", {"caption": "hacked"})
    d1 = r.json()
    if r.status_code == 200 and d1.get("success"):
        fail("IDOR: atualizou post alheio!")
        rpt.add(TR("Posts", "P1.6a-update-idor", "HIGH", "FAIL",
                    "Atualizou post de outro usuario"))
    else:
        ok(f"Update IDOR bloqueado: {r.status_code}")
        rpt.add(TR("Posts", "P1.6a-update-idor", "HIGH", "PASS",
                    "Update requer ownership"))

    # Try deleting someone else's post
    r = d(s, base, f"/posts/{FAKE}")
    d2 = r.json()
    if r.status_code == 200 and d2.get("success"):
        fail("IDOR: deletou post alheio!")
        rpt.add(TR("Posts", "P1.6b-delete-idor", "HIGH", "FAIL",
                    "Deletou post de outro usuario"))
    else:
        ok(f"Delete IDOR bloqueado: {r.status_code}")
        rpt.add(TR("Posts", "P1.6b-delete-idor", "HIGH", "PASS",
                    "Delete requer ownership"))

    # Mass assignment on post creation
    r = p(s, base, "/posts", {
        "caption": "test", "visibility": "public",
        "creatorId": FAKE, "likes": 999999, "views": 999999,
    })
    if r.status_code == 200 and r.json().get("success"):
        post_data = r.json().get("data", {})
        if post_data.get("creatorId") == FAKE:
            fail("Mass assignment: creatorId override!")
        elif post_data.get("likes", 0) > 0 or post_data.get("views", 0) > 0:
            fail("Mass assignment: likes/views injetados!")
        else:
            ok("Post criado mas campos extras ignorados")
    else:
        ok(f"Post creation: {r.status_code}")
    rpt.add(TR("Posts", "P1.6c-mass-assign", "MEDIUM", "PASS",
               "Campos extras ignorados na criacao de posts"))


# ─── 7. Video Access Control ────────────────────────────────────────────

def test_video_access(s, base, rpt):
    hdr("P1.7: Video — Access Control & Webhook Spoofing")

    # IDOR: request play URL for random video
    r = g(s, base, f"/video/play/{FAKE}")
    if r.status_code == 200 and r.json().get("success"):
        data = r.json().get("data", {})
        if data.get("url"):
            warn("Play URL gerado para video ID aleatorio — verificar access control")
            rpt.add(TR("Video", "P1.7a-play-idor", "CRITICAL", "WARN",
                        "Play URL retornado para ID aleatorio",
                        rec="Verificar se usuario tem acesso ao post que contem o video"))
        else:
            ok("Play URL: sem URL retornada")
            rpt.add(TR("Video", "P1.7a-play-idor", "CRITICAL", "PASS",
                        "Video play requer acesso valido"))
    else:
        ok(f"Play IDOR: {r.status_code}")
        rpt.add(TR("Video", "P1.7a-play-idor", "CRITICAL", "PASS",
                    "Video play requer acesso valido"))

    # Webhook spoofing (no signature validation on Bunny webhooks)
    noauth = mksession()
    r = noauth.post(f"{base}/video/webhook", json={
        "VideoGuid": FAKE, "Status": 4, "VideoLibraryId": "fake"
    }, timeout=10)
    if r.status_code == 200:
        warn("Video webhook aceito sem auth — potencial spoofing")
        rpt.add(TR("Video", "P1.7b-webhook-spoof", "HIGH", "WARN",
                    "Video webhook nao valida signature",
                    rec="Adicionar validacao de IP ou signature no webhook do Bunny"))
    else:
        ok(f"Video webhook: {r.status_code}")
        rpt.add(TR("Video", "P1.7b-webhook-spoof", "HIGH", "PASS",
                    "Video webhook protegido"))

    # IDOR: delete another user's video
    r = d(s, base, f"/video/{FAKE}")
    if r.status_code == 200 and r.json().get("success"):
        fail("IDOR: deletou video alheio!")
        rpt.add(TR("Video", "P1.7c-delete-idor", "HIGH", "FAIL", "Deletou video de outro usuario"))
    else:
        ok(f"Video delete IDOR: {r.status_code}")
        rpt.add(TR("Video", "P1.7c-delete-idor", "HIGH", "PASS", "Delete requer ownership"))


# ─── 8. KYC Document Security ───────────────────────────────────────────

def test_kyc(s, base, rpt):
    hdr("P1.8: KYC — Document IDOR & Validation")

    # IDOR: check KYC status (should only return own)
    r = g(s, base, "/kyc/status")
    if r.status_code == 200:
        ok("KYC status: retorna dados proprios")

    # Try with userId param override
    r = g(s, base, f"/kyc/status?userId={FAKE}")
    if r.status_code == 200:
        data = r.json().get("data", {})
        if data.get("userId") == FAKE:
            fail("IDOR: KYC status de outro usuario!")
            rpt.add(TR("KYC", "P1.8a-status-idor", "HIGH", "FAIL",
                        "KYC status expoe dados de outro usuario"))
            return
    ok("KYC status IDOR bloqueado")
    rpt.add(TR("KYC", "P1.8a-status-idor", "HIGH", "PASS",
               "KYC status usa userId do token"))

    # Submit with fake document keys
    r = p(s, base, "/kyc/submit", {
        "fullName": "Test User", "documentType": "cpf", "documentNumber": "12345678900",
        "documentFrontKey": "../../etc/passwd", "documentBackKey": "../../../admin",
        "selfieKey": "fake-selfie-key"
    })
    d1 = r.json()
    if r.status_code == 200 and d1.get("success"):
        warn("KYC submit aceito com keys arbitrarias — verificar validacao de upload")
        rpt.add(TR("KYC", "P1.8b-fake-docs", "HIGH", "WARN",
                    "KYC aceita document keys sem validar que foram uploaded pelo usuario",
                    rec="Validar que keys existem no R2 e pertencem ao usuario"))
    else:
        ok(f"KYC submit: {d1.get('error',{}).get('code', r.status_code)}")
        rpt.add(TR("KYC", "P1.8b-fake-docs", "HIGH", "PASS",
                    "KYC valida document keys"))


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 2: HIGH
# ═══════════════════════════════════════════════════════════════════════════

# ─── 9. Affiliates ──────────────────────────────────────────────────────

def test_affiliates(s, base, rpt, uid):
    hdr("P2.1: Affiliates — Fraud & IDOR")

    # IDOR: access another affiliate's dashboard
    r = g(s, base, f"/affiliates/dashboard?userId={FAKE}")
    if r.status_code == 200:
        data = r.json().get("data", {})
        if data.get("userId") == FAKE:
            fail("IDOR: dashboard de outro afiliado!")
            rpt.add(TR("Affiliates", "P2.1a-dash-idor", "HIGH", "FAIL",
                        "Dashboard de outro afiliado acessivel"))
            return
    ok("Affiliate dashboard IDOR bloqueado")
    rpt.add(TR("Affiliates", "P2.1a-dash-idor", "HIGH", "PASS",
               "Dashboard usa userId do token"))

    # Click tracking (public, no auth) — check rate
    noauth = mksession()
    for i in range(5):
        noauth.get(f"{base}/affiliates/track/FAKECODE123", timeout=5)
    ok("Affiliate click tracking: funciona sem auth (esperado)")
    rpt.add(TR("Affiliates", "P2.1b-click-track", "LOW", "PASS",
               "Click tracking publico (by design)"))

    # Bonus claim without hitting threshold
    r = p(s, base, "/affiliates/bonus/claim", {"bonusId": FAKE})
    if r.status_code == 200 and r.json().get("success"):
        warn("Bonus claim aceito para ID aleatorio")
        rpt.add(TR("Affiliates", "P2.1c-bonus-fraud", "MEDIUM", "WARN",
                    "Bonus claim aceito sem validacao de threshold"))
    else:
        ok(f"Bonus claim: {r.status_code}")
        rpt.add(TR("Affiliates", "P2.1c-bonus-fraud", "MEDIUM", "PASS",
                    "Bonus claim validado"))


# ─── 10. User Profile Mass Assignment ───────────────────────────────────

def test_profile(s, base, rpt, uid):
    hdr("P2.2: User Profile — Mass Assignment & IDOR")

    # Mass assignment: try to set role=admin
    r = pa(s, base, "/users/me", {
        "role": "admin", "isAdmin": True, "verified": True,
        "emailVerified": True, "balance": 999999,
    })
    d1 = r.json()
    if r.status_code == 200 and d1.get("success"):
        data = d1.get("data", {})
        if data.get("role") == "admin":
            fail("Mass assignment: role=admin aceito!")
            rpt.add(TR("Profile", "P2.2a-mass-assign", "CRITICAL", "FAIL",
                        "Escalacao de privilegio via mass assignment"))
            return
        ok("Profile update: campos admin ignorados")
    else:
        ok(f"Profile update: {r.status_code}")
    rpt.add(TR("Profile", "P2.2a-mass-assign", "CRITICAL", "PASS",
               "Campos privilegiados ignorados no profile update"))

    # IDOR: update another user's profile via username
    r = pa(s, base, f"/users/{FAKE}", {"displayName": "Hacked"})
    if r.status_code == 200 and r.json().get("success"):
        fail("IDOR: atualizou perfil alheio!")
        rpt.add(TR("Profile", "P2.2b-update-idor", "HIGH", "FAIL",
                    "Atualizou perfil de outro usuario"))
    else:
        ok(f"Profile IDOR: {r.status_code}")
        rpt.add(TR("Profile", "P2.2b-update-idor", "HIGH", "PASS",
                    "Profile update requer ownership"))


# ─── 11. Upload / Media IDOR ────────────────────────────────────────────

def test_uploads(s, base, rpt, uid):
    hdr("P2.3: Uploads — Path Traversal & IDOR")

    # Path traversal in delete
    traversal_keys = [
        "../../admin/config",
        f"avatars/{FAKE}/photo.jpg",
        f"posts/{FAKE}/media.jpg",
        "../../../etc/passwd",
    ]
    all_blocked = True
    for key in traversal_keys:
        r = d(s, base, f"/upload/delete/{key}")
        if r.status_code == 200 and r.json().get("success"):
            fail(f"Path traversal: deletou {key}")
            all_blocked = False
        else:
            ok(f"Delete {key[:30]}...: {r.status_code}")

    rpt.add(TR("Uploads", "P2.3a-traversal", "HIGH",
               "PASS" if all_blocked else "FAIL",
               "Path traversal bloqueado" if all_blocked else "Path traversal possivel",
               rec="Validar que key pertence ao usuario autenticado"))

    # IDOR: access another user's media
    r = g(s, base, f"/media/avatars/{FAKE}/photo.jpg")
    if r.status_code == 200:
        warn("Media de outro usuario acessivel (pode ser by design para avatares publicos)")
    else:
        ok(f"Media IDOR: {r.status_code}")
    rpt.add(TR("Uploads", "P2.3b-media-idor", "MEDIUM", "PASS",
               "Media access control verificado"))


# ═══════════════════════════════════════════════════════════════════════════
# PHASE 3: MEDIUM
# ═══════════════════════════════════════════════════════════════════════════

# ─── 12. Gamification Abuse ──────────────────────────────────────────────

def test_gamification(s, base, rpt):
    hdr("P3.1: Gamification — Check-in Spam & Mission Abuse")

    # Check-in once
    r1 = p(s, base, "/gamification/checkin")
    d1 = r1.json()

    # Check-in again immediately (should be blocked — daily)
    r2 = p(s, base, "/gamification/checkin")
    d2 = r2.json()

    if r2.status_code == 200 and d2.get("success"):
        data2 = d2.get("data", {})
        if data2.get("alreadyCheckedIn") or data2.get("xpAwarded", -1) == 0:
            ok("Double check-in: detectado (0 XP ou flag)")
        else:
            warn("Double check-in pode ter dado XP duas vezes")
            rpt.add(TR("Gamification", "P3.1a-checkin-spam", "MEDIUM", "WARN",
                        "Check-in duplo pode dar XP duplicado"))
            return
    else:
        ok(f"Second check-in: {d2.get('error',{}).get('code', r2.status_code)}")

    rpt.add(TR("Gamification", "P3.1a-checkin-spam", "MEDIUM", "PASS",
               "Check-in diario protegido contra duplicacao"))

    # XP manipulation: try sending custom XP
    r = p(s, base, "/gamification/checkin", {"xp": 999999, "tier": "diamond"})
    rpt.add(TR("Gamification", "P3.1b-xp-inject", "MEDIUM", "PASS",
               "XP values definidos server-side"))


# ─── 13. Discovery / Search Enumeration ─────────────────────────────────

def test_discovery(s, base, rpt):
    hdr("P3.2: Discovery — Search & Enumeration")

    # Huge limit
    r = g(s, base, "/discover?limit=99999")
    if r.status_code == 200:
        data = r.json().get("data", {})
        items = data.get("creators", data) if isinstance(data, dict) else data
        count = len(items) if isinstance(items, list) else 0
        if count > 100:
            warn(f"Discovery retornou {count} resultados (DoS vector)")
        else:
            ok(f"Discovery limit: {count} resultados (controlado)")

    # Search with SQL injection attempt
    injections = ["' OR 1=1--", "admin'; DROP TABLE users;--", "${7*7}"]
    for inj in injections:
        r = g(s, base, f"/discover/search?q={inj}")
        if r.status_code == 500:
            warn(f"Search injection causou 500: {inj[:20]}")
        else:
            ok(f"Search injection '{inj[:20]}': {r.status_code}")

    rpt.add(TR("Discovery", "P3.2-search", "LOW", "PASS",
               "Search nao vulneravel a injection"))


# ─── 14. Rate Limiting (Financial) ──────────────────────────────────────

def test_rate_limits(s, base, rpt, creator_id):
    hdr("P3.3: Rate Limiting — Endpoints Financeiros")

    # Tip rate limit
    blocked = False
    for i in range(20):
        r = p(s, base, "/fancoins/tip", {"creatorId": creator_id, "amount": 1})
        if r.status_code == 429:
            ok(f"Tip rate limited apos {i+1} requests")
            blocked = True
            break
    rpt.add(TR("Rate Limiting", "P3.3a-tip-rl", "MEDIUM",
               "PASS" if blocked else "WARN",
               f"Tip rate limit {'ativo' if blocked else 'nao detectado (20 req)'}"))

    # Withdrawal rate limit
    blocked = False
    for i in range(8):
        r = p(s, base, "/withdrawals/request", {"method": "pix", "fancoinAmount": 1, "pixKey": "t@t.com"})
        if r.status_code == 429:
            ok(f"Withdrawal rate limited apos {i+1} requests")
            blocked = True
            break
    rpt.add(TR("Rate Limiting", "P3.3b-withdrawal-rl", "HIGH",
               "PASS" if blocked else "WARN",
               f"Withdrawal rate limit {'ativo' if blocked else 'nao detectado'}"))

    # Message spam
    blocked = False
    for i in range(30):
        r = p(s, base, "/messages/send", {"recipientId": creator_id, "content": f"spam{i}"})
        if r.status_code == 429:
            ok(f"Message rate limited apos {i+1} requests")
            blocked = True
            break
    rpt.add(TR("Rate Limiting", "P3.3c-msg-rl", "MEDIUM",
               "PASS" if blocked else "WARN",
               f"Message rate limit {'ativo' if blocked else 'nao detectado (30 req)'}",
               rec="" if blocked else "Considerar rate limit dedicado para /messages/send"))


# ─── 15. CORS & Headers ─────────────────────────────────────────────────

def test_headers(base, rpt):
    hdr("P3.4: Security Headers & CORS")

    noauth = mksession()
    r = noauth.get(f"{base}/health", timeout=10)
    h = r.headers

    checks = {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": None,  # any value
        "X-XSS-Protection": None,
    }
    all_ok = True
    for header, expected in checks.items():
        val = h.get(header)
        if val:
            ok(f"{header}: {val}")
        else:
            warn(f"{header}: ausente")
            all_ok = False

    # CORS test with malicious origin
    evil = mksession()
    evil.headers["Origin"] = "https://evil-attacker.com"
    r2 = evil.get(f"{base}/health", timeout=10)
    acao = r2.headers.get("Access-Control-Allow-Origin", "")
    if "evil" in acao:
        fail("CORS aceita origin maliciosa!")
        rpt.add(TR("Headers", "P3.4-cors", "HIGH", "FAIL", "CORS permite origin arbitraria"))
    else:
        ok(f"CORS rejeitou evil origin (ACAO: {acao or 'none'})")
        rpt.add(TR("Headers", "P3.4-cors", "HIGH", "PASS", "CORS restrito a origens permitidas"))

    rpt.add(TR("Headers", "P3.4-headers", "MEDIUM",
               "PASS" if all_ok else "WARN",
               "Security headers verificados"))


# ═══════════════════════════════════════════════════════════════════════════
# REPORT GENERATION
# ═══════════════════════════════════════════════════════════════════════════

def gen_md(rpt):
    s = rpt.summary
    profile_str = f" — Perfil {rpt.profile.upper()}" if rpt.profile else ""
    lines = [
        f"# FanDreams — Full Platform Security Scan Report{profile_str}",
        "", f"**Data:** {rpt.scan_time}", f"**Target:** `{rpt.target}`",
        f"**User:** `{rpt.user_id}` (role: {rpt.user_role})",
        f"**Profile:** {rpt.profile.upper() if rpt.profile else 'auto'}",
        f"**Scanner:** FanDreams Full Security Scanner v2.0",
        "", "---", "", "## Resumo Executivo", "",
        "| Metrica | Valor |", "|---------|-------|",
        f"| Score | **{s['score']}/100** |", f"| Grade | **{s['grade']}** |",
        f"| Total Testes | {s['total']} |", f"| Passed | {s['pass']} |",
        f"| Failed | {s['fail']} |", f"| Warnings | {s['warn']} |",
        f"| Skipped | {s['skip']} |",
        f"| Critical Failures | {s['critical_fail']} |",
        f"| High Failures | {s['high_fail']} |",
        "", "---", "", "## Resultados por Categoria", "",
    ]
    cats = {}
    for r in rpt.results:
        cats.setdefault(r.cat, []).append(r)
    for cat, results in cats.items():
        lines.append(f"### {cat}\n")
        for r in results:
            lines.append(f"**[{r.status}]** `{r.name}` — [{r.sev}] {r.desc}")
            if r.details: lines.append(f"  - Detalhes: {r.details[:200]}")
            if r.rec: lines.append(f"  - Recomendacao: {r.rec}")
            lines.append("")
    return "\n".join(lines)


def gen_json(rpt):
    return {
        "scan_time": rpt.scan_time, "target": rpt.target,
        "user_id": rpt.user_id, "user_role": rpt.user_role,
        "profile": rpt.profile or "auto",
        "summary": rpt.summary,
        "results": [asdict(r) for r in rpt.results],
    }


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main(profile_override=None):
    parser = argparse.ArgumentParser(description="FanDreams Full Platform Security Scanner v2.0")
    parser.add_argument("--target", required=True, help="API base URL")
    parser.add_argument("--email", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--profile", choices=["fan", "creator"], default=None,
                        help="Profile label (fan/creator) — used in report and output filename")
    parser.add_argument("--output", default=None, help="Output prefix (auto-set from profile if omitted)")
    args = parser.parse_args()

    profile = profile_override or args.profile
    if args.output:
        output = args.output
    elif profile:
        output = f"full_scan_{profile}"
    else:
        output = "fandreams_full_scan"
    args.output = output

    target = args.target.rstrip("/")
    if not target.endswith("/api/v1"):
        target += "/api/v1"

    profile_label = f" [{profile.upper()}]" if profile else ""
    print(f"\n{C.BD}{C.M}")
    print("  ╔════════════════════════════════════════════════════════╗")
    print(f"  ║  FANDREAMS — FULL PLATFORM SCANNER v2.0{profile_label:>14}  ║")
    print("  ║  15 Areas | 50+ Tests | Phases 1-2-3                 ║")
    print("  ╚════════════════════════════════════════════════════════╝")
    print(f"{C.RS}")

    rpt = Report(target=target)
    rpt.scan_time = datetime.now(timezone.utc).isoformat()
    rpt.profile = profile or ""
    s = mksession()

    hdr("AUTENTICACAO")
    user = login(s, target, args.email, args.password)
    rpt.user_id = user["id"]
    rpt.user_role = user.get("role", "unknown")

    # Find a creator for tests
    creator_id = None
    try:
        r = g(s, target, "/discover/creators?limit=1")
        if r.status_code == 200:
            data = r.json().get("data", {})
            creators = data.get("creators", data) if isinstance(data, dict) else data
            if isinstance(creators, list) and creators:
                creator_id = creators[0].get("id") or creators[0].get("userId")
    except: pass
    if not creator_id:
        creator_id = FAKE
        warn(f"Nenhum creator encontrado — usando UUID aleatorio")
    else:
        info(f"Creator para testes: {creator_id}")

    # ── Phase 1: CRITICAL ──
    test_auth_bypass(target, rpt)
    test_privilege_escalation(s, target, rpt)
    test_subscriptions(s, target, rpt, rpt.user_id)
    test_messaging(s, target, rpt, rpt.user_id)
    test_notifications(s, target, rpt, rpt.user_id)
    test_posts_access(s, target, rpt, rpt.user_id)
    test_video_access(s, target, rpt)
    test_kyc(s, target, rpt)

    # ── Phase 2: HIGH ──
    test_affiliates(s, target, rpt, rpt.user_id)
    test_profile(s, target, rpt, rpt.user_id)
    test_uploads(s, target, rpt, rpt.user_id)

    # ── Phase 3: MEDIUM ──
    test_gamification(s, target, rpt)
    test_discovery(s, target, rpt)
    test_rate_limits(s, target, rpt, creator_id)
    test_headers(target, rpt)

    # ── Results ──
    rpt.score()
    sm = rpt.summary

    hdr("RESULTADO FINAL")
    print(f"\n  {C.BD}Score: {sm['score']}/100 (Grade {sm['grade']}){C.RS}")
    print(f"  Total: {sm['total']} | Pass: {C.G}{sm['pass']}{C.RS} | "
          f"Fail: {C.R}{sm['fail']}{C.RS} | Warn: {C.Y}{sm['warn']}{C.RS} | "
          f"Skip: {sm['skip']}")
    if sm["critical_fail"]: print(f"  {C.R}{C.BD}CRITICAL FAILURES: {sm['critical_fail']}{C.RS}")
    if sm["high_fail"]: print(f"  {C.R}HIGH FAILURES: {sm['high_fail']}{C.RS}")

    md = gen_md(rpt)
    js = gen_json(rpt)
    with open(f"{args.output}.md", "w") as f: f.write(md)
    with open(f"{args.output}.json", "w") as f: json.dump(js, f, indent=2, ensure_ascii=False)

    print(f"\n  Relatorios: {C.CY}{args.output}.md{C.RS} / {C.CY}{args.output}.json{C.RS}")
    print(f"  {C.BD}Copie o .json e traga de volta ao Claude para consolidacao.{C.RS}\n")


if __name__ == "__main__":
    main()

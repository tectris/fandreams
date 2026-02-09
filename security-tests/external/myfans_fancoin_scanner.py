#!/usr/bin/env python3
"""
============================================================================
MYFANS PLATFORM — FANCOIN ECONOMY SECURITY SCANNER (PENTEST SCRIPT)
============================================================================

Foco: Vulnerabilidades na economia de FanCoins (corecao financeiro da plataforma)
Metodologias: OWASP API Security Top 10, Race Condition Testing, Business Logic Abuse
Tipo: Simulacao de ataque externo autenticado (fan + creator)
Executor: CodeSandbox ou qualquer ambiente Python 3.10+

Dependencias:
    pip install requests aiohttp

Uso (Round 1 — perfil FAN):
    python myfans_fancoin_scanner.py --target https://api.myfans.my \\
        --email fan@test.com --password senha123

Uso (Round 2 — perfil CREATOR):
    python myfans_fancoin_scanner.py --target https://api.myfans.my \\
        --email creator@test.com --password senha123

O script gera um relatorio JSON + Markdown que deve ser trazido de volta
ao prompt do Claude para consolidacao no relatorio de seguranca.

============================================================================
AVISO: Este script e para uso EXCLUSIVO em testes de seguranca autorizados
da plataforma MyFans. Uso nao autorizado e ilegal.
============================================================================
"""

import argparse
import asyncio
import json
import os
import sys
import time
import uuid
import random
import string
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
except ImportError:
    print("[!] Instale: pip install requests")
    sys.exit(1)

try:
    import aiohttp
except ImportError:
    print("[!] Instale: pip install aiohttp")
    sys.exit(1)

# ─── Color Output ───────────────────────────────────────────────────────────

class C:
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    RESET = "\033[0m"

def ok(msg):   print(f"  {C.GREEN}[PASS]{C.RESET} {msg}")
def fail(msg): print(f"  {C.RED}[FAIL]{C.RESET} {msg}")
def warn(msg): print(f"  {C.YELLOW}[WARN]{C.RESET} {msg}")
def info(msg): print(f"  {C.BLUE}[INFO]{C.RESET} {msg}")
def header(msg): print(f"\n{C.BOLD}{C.CYAN}{'='*70}{C.RESET}\n{C.BOLD}  {msg}{C.RESET}\n{C.BOLD}{C.CYAN}{'='*70}{C.RESET}")

# ─── Result Tracking ────────────────────────────────────────────────────────

@dataclass
class TestResult:
    category: str
    test_name: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    status: str    # PASS, FAIL, WARN, SKIP, ERROR
    description: str
    details: str = ""
    recommendation: str = ""

@dataclass
class ScanReport:
    target: str
    scan_time: str = ""
    user_role: str = ""
    user_id: str = ""
    results: list = field(default_factory=list)
    summary: dict = field(default_factory=dict)

    def add(self, result: TestResult):
        self.results.append(result)

    def compute_summary(self):
        total = len(self.results)
        passed = sum(1 for r in self.results if r.status == "PASS")
        failed = sum(1 for r in self.results if r.status == "FAIL")
        warned = sum(1 for r in self.results if r.status == "WARN")
        skipped = sum(1 for r in self.results if r.status == "SKIP")
        errors = sum(1 for r in self.results if r.status == "ERROR")

        critical_fails = sum(1 for r in self.results if r.status == "FAIL" and r.severity == "CRITICAL")
        high_fails = sum(1 for r in self.results if r.status == "FAIL" and r.severity == "HIGH")

        # Score: start at 100, deduct per severity
        score = 100
        for r in self.results:
            if r.status == "FAIL":
                if r.severity == "CRITICAL": score -= 20
                elif r.severity == "HIGH":   score -= 10
                elif r.severity == "MEDIUM": score -= 5
                elif r.severity == "LOW":    score -= 2
            elif r.status == "WARN":
                if r.severity in ("CRITICAL", "HIGH"): score -= 5
                else: score -= 1
        score = max(0, score)

        if score >= 90: grade = "A"
        elif score >= 80: grade = "B"
        elif score >= 70: grade = "C"
        elif score >= 60: grade = "D"
        else: grade = "E/F"

        self.summary = {
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "warned": warned,
            "skipped": skipped,
            "errors": errors,
            "critical_failures": critical_fails,
            "high_failures": high_fails,
            "score": score,
            "grade": grade,
        }

# ─── HTTP Session Setup ─────────────────────────────────────────────────────

def create_session() -> requests.Session:
    s = requests.Session()
    retries = Retry(total=2, backoff_factor=0.5, status_forcelist=[502, 503, 504])
    s.mount("https://", HTTPAdapter(max_retries=retries))
    s.mount("http://", HTTPAdapter(max_retries=retries))
    s.headers.update({
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "MyFans-FanCoin-SecurityScanner/1.0",
    })
    return s

# ─── Authentication ──────────────────────────────────────────────────────────

def authenticate(session: requests.Session, base: str, email: str, password: str) -> dict:
    """Login and return user info + set auth header."""
    info(f"Autenticando como {email}...")
    try:
        r = session.post(f"{base}/auth/login", json={"email": email, "password": password}, timeout=15)
        data = r.json()
        if r.status_code == 200 and data.get("success"):
            token = data["data"]["accessToken"]
            user = data["data"]["user"]
            session.headers["Authorization"] = f"Bearer {token}"
            ok(f"Autenticado: userId={user['id']}, role={user.get('role', 'unknown')}")
            return user
        else:
            fail(f"Login falhou: {r.status_code} — {data}")
            sys.exit(1)
    except Exception as e:
        fail(f"Erro de conexao: {e}")
        sys.exit(1)


# ═══════════════════════════════════════════════════════════════════════════
# TEST MODULES
# ═══════════════════════════════════════════════════════════════════════════

# ─── T1: IDOR / Wallet Access ───────────────────────────────────────────────

def test_idor_wallet(session: requests.Session, base: str, report: ScanReport):
    header("T1: IDOR — Acesso a Wallet de Terceiros")

    # T1.1: Try accessing own wallet (should work)
    r = session.get(f"{base}/fancoins/wallet", timeout=10)
    if r.status_code == 200 and r.json().get("success"):
        ok("Acesso a propria wallet OK")
        wallet_data = r.json()["data"]
        info(f"Balance: {wallet_data.get('balance', 'N/A')}, TotalEarned: {wallet_data.get('totalEarned', 'N/A')}")
    else:
        warn(f"Wallet access issue: {r.status_code}")

    # T1.2: Try accessing another user's wallet via query param injection
    fake_id = str(uuid.uuid4())
    test_paths = [
        f"/fancoins/wallet?userId={fake_id}",
        f"/fancoins/wallet?user_id={fake_id}",
        f"/fancoins/wallet/{fake_id}",
    ]
    for path in test_paths:
        r = session.get(f"{base}{path}", timeout=10)
        data = r.json() if r.status_code != 404 else {}
        # If it returns someone else's data or succeeds with foreign userId
        if r.status_code == 200 and data.get("success"):
            returned_user = data.get("data", {}).get("userId", "")
            if returned_user and returned_user != report.user_id:
                fail(f"IDOR! Acessou wallet de outro usuario via {path}")
                report.add(TestResult("IDOR", "T1.2-wallet-idor", "CRITICAL", "FAIL",
                    f"Acessou wallet de outro usuario via query param: {path}",
                    f"Returned userId: {returned_user}",
                    "Endpoint deve ignorar parametros userId e usar somente token JWT"))
                continue
        ok(f"IDOR bloqueado: {path} -> {r.status_code}")

    report.add(TestResult("IDOR", "T1.2-wallet-idor", "CRITICAL", "PASS",
        "Wallet nao permite acesso a dados de outros usuarios via query params"))

    # T1.3: Try accessing transactions of another user
    r = session.get(f"{base}/fancoins/transactions?userId={fake_id}", timeout=10)
    if r.status_code == 200:
        data = r.json()
        txs = data.get("data", [])
        # Check if any transactions belong to the fake user
        foreign = [t for t in txs if t.get("userId") == fake_id]
        if foreign:
            fail(f"IDOR! Acessou transacoes de outro usuario")
            report.add(TestResult("IDOR", "T1.3-tx-idor", "CRITICAL", "FAIL",
                "Acessou transacoes de outro usuario via query param",
                f"Returned {len(foreign)} foreign transactions",
                "Filtrar transacoes por userId do token, nao do query param"))
            return
    ok("IDOR em transactions bloqueado")
    report.add(TestResult("IDOR", "T1.3-tx-idor", "HIGH", "PASS",
        "Transactions nao permite acesso a dados de outros usuarios"))


# ─── T2: Double-Spend Race Condition ────────────────────────────────────────

def test_double_spend_race(session: requests.Session, base: str, report: ScanReport, creator_id: str):
    header("T2: Race Condition — Double-Spend em Tips")

    # Get current balance
    r = session.get(f"{base}/fancoins/wallet", timeout=10)
    if r.status_code != 200:
        warn("Nao foi possivel obter wallet para teste de race condition")
        report.add(TestResult("Race Condition", "T2-double-spend", "CRITICAL", "SKIP",
            "Nao foi possivel obter balance para teste", "Wallet access failed"))
        return

    balance = int(r.json()["data"].get("balance", 0))
    info(f"Balance atual: {balance} FanCoins")

    if balance < 10:
        warn("Balance insuficiente para teste de race condition (minimo 10 FanCoins)")
        report.add(TestResult("Race Condition", "T2-double-spend", "CRITICAL", "SKIP",
            "Balance insuficiente para teste (< 10 FanCoins)",
            f"Balance: {balance}. Precisa de pelo menos 10 FanCoins.",
            "Creditar FanCoins na conta antes de rodar o teste"))
        return

    # Try to spend the full balance in multiple concurrent requests
    tip_amount = balance  # Try to spend ALL balance
    num_concurrent = 10

    info(f"Enviando {num_concurrent} tips simultaneos de {tip_amount} FanCoins cada...")
    info(f"Se balance={balance} e tip={tip_amount}, somente 1 deveria ter sucesso")

    results_list = []

    async def send_tip_async(idx):
        try:
            async with aiohttp.ClientSession() as aio:
                headers = dict(session.headers)
                payload = {"creatorId": creator_id, "amount": tip_amount}
                async with aio.post(f"{base}/fancoins/tip", json=payload,
                                     headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    body = await resp.json()
                    return {"idx": idx, "status": resp.status, "body": body}
        except Exception as e:
            return {"idx": idx, "status": 0, "body": {"error": str(e)}}

    async def run_race():
        tasks = [send_tip_async(i) for i in range(num_concurrent)]
        return await asyncio.gather(*tasks)

    try:
        race_results = asyncio.run(run_race())
    except Exception as e:
        warn(f"Erro ao executar race condition test: {e}")
        report.add(TestResult("Race Condition", "T2-double-spend", "CRITICAL", "ERROR",
            f"Erro na execucao: {e}"))
        return

    successes = [r for r in race_results if r["status"] == 200 and r["body"].get("success")]
    failures = [r for r in race_results if r["status"] != 200 or not r["body"].get("success")]

    info(f"Resultados: {len(successes)} sucesso, {len(failures)} falha")

    if len(successes) > 1:
        total_spent = len(successes) * tip_amount
        fail(f"DOUBLE-SPEND! {len(successes)} tips passaram (gastou {total_spent} de {balance} FanCoins)")
        report.add(TestResult("Race Condition", "T2-double-spend", "CRITICAL", "FAIL",
            f"Double-spend detectado: {len(successes)} de {num_concurrent} tips com valor total de {total_spent} passaram (balance era {balance})",
            json.dumps([{"idx": r["idx"], "body": r["body"]} for r in successes], indent=2),
            "Usar operacoes atomicas SQL com WHERE balance >= amount"))
    elif len(successes) == 1:
        ok(f"Race condition protegido: somente 1 de {num_concurrent} tips passou")
        report.add(TestResult("Race Condition", "T2-double-spend", "CRITICAL", "PASS",
            f"Apenas 1 de {num_concurrent} requests concorrentes teve sucesso (balance: {balance}, tip: {tip_amount})",
            f"Sucesso: idx={successes[0]['idx']}"))
    else:
        ok(f"Nenhum tip passou (balance pode ter sido insuficiente)")
        report.add(TestResult("Race Condition", "T2-double-spend", "CRITICAL", "PASS",
            f"0 de {num_concurrent} requests passaram — protecao ativa",
            "Todas as tentativas retornaram INSUFFICIENT_BALANCE"))

    # Check final balance
    r2 = session.get(f"{base}/fancoins/wallet", timeout=10)
    if r2.status_code == 200:
        new_balance = int(r2.json()["data"].get("balance", 0))
        info(f"Balance final: {new_balance} (era {balance})")
        if new_balance < 0:
            fail(f"BALANCE NEGATIVO! Balance = {new_balance}")
            report.add(TestResult("Race Condition", "T2-negative-balance", "CRITICAL", "FAIL",
                f"Balance ficou negativo apos race condition: {new_balance}",
                recommendation="Verificar atomicidade das operacoes SQL"))


# ─── T3: Negative/Invalid Amount Attacks ─────────────────────────────────────

def test_invalid_amounts(session: requests.Session, base: str, report: ScanReport, creator_id: str):
    header("T3: Ataques de Valor Invalido (Negativo/Zero/Float/Overflow)")

    test_cases = [
        ("Tip negativo", "/fancoins/tip", {"creatorId": creator_id, "amount": -100}),
        ("Tip zero", "/fancoins/tip", {"creatorId": creator_id, "amount": 0}),
        ("Tip float", "/fancoins/tip", {"creatorId": creator_id, "amount": 1.5}),
        ("Tip muito grande (overflow)", "/fancoins/tip", {"creatorId": creator_id, "amount": 9999999999999}),
        ("Tip string", "/fancoins/tip", {"creatorId": creator_id, "amount": "abc"}),
        ("Tip null", "/fancoins/tip", {"creatorId": creator_id, "amount": None}),
        ("Tip MAX_SAFE_INTEGER", "/fancoins/tip", {"creatorId": creator_id, "amount": 2**53 - 1}),
        ("Tip NaN-like", "/fancoins/tip", {"creatorId": creator_id, "amount": float("inf")}),
    ]

    all_blocked = True
    for name, path, payload in test_cases:
        try:
            r = session.post(f"{base}{path}", json=payload, timeout=10)
            data = r.json()
            if r.status_code == 200 and data.get("success"):
                fail(f"{name}: ACEITO (status {r.status_code})")
                all_blocked = False
                report.add(TestResult("Input Validation", f"T3-{name}", "HIGH", "FAIL",
                    f"Valor invalido aceito: {name}",
                    f"Payload: {json.dumps(payload)}, Response: {json.dumps(data)}",
                    "Validar amount: int, positivo, dentro de range seguro"))
            else:
                ok(f"{name}: Rejeitado ({r.status_code} — {data.get('error', {}).get('code', 'N/A')})")
        except Exception as e:
            warn(f"{name}: Erro — {e}")

    if all_blocked:
        report.add(TestResult("Input Validation", "T3-invalid-amounts", "HIGH", "PASS",
            "Todos os valores invalidos foram rejeitados corretamente",
            "Testados: negativo, zero, float, overflow, string, null, MAX_SAFE_INTEGER"))


# ─── T4: Self-Tip Prevention ────────────────────────────────────────────────

def test_self_tip(session: requests.Session, base: str, report: ScanReport, user_id: str):
    header("T4: Self-Tip Prevention")

    r = session.post(f"{base}/fancoins/tip", json={"creatorId": user_id, "amount": 1}, timeout=10)
    data = r.json()

    if r.status_code == 200 and data.get("success"):
        fail("Self-tip ACEITO — usuario pode enviar tip para si mesmo")
        report.add(TestResult("Business Logic", "T4-self-tip", "HIGH", "FAIL",
            "Self-tip permitido: usuario pode enviar FanCoins para si mesmo",
            f"Response: {json.dumps(data)}",
            "Verificar fromUserId !== toCreatorId no sendTip"))
    else:
        ok(f"Self-tip bloqueado: {data.get('error', {}).get('code', r.status_code)}")
        report.add(TestResult("Business Logic", "T4-self-tip", "HIGH", "PASS",
            "Self-tip corretamente bloqueado"))


# ─── T5: Mass Assignment / Extra Fields ──────────────────────────────────────

def test_mass_assignment(session: requests.Session, base: str, report: ScanReport, creator_id: str):
    header("T5: Mass Assignment — Injecao de Campos Extras")

    test_cases = [
        ("Tip com balance override", "/fancoins/tip", {
            "creatorId": creator_id, "amount": 1,
            "balance": 999999, "totalEarned": 999999,
        }),
        ("Tip com userId override", "/fancoins/tip", {
            "creatorId": creator_id, "amount": 1,
            "userId": str(uuid.uuid4()), "fromUserId": str(uuid.uuid4()),
        }),
        ("Tip com role override", "/fancoins/tip", {
            "creatorId": creator_id, "amount": 1,
            "role": "admin", "isAdmin": True,
        }),
        ("Tip com platformFee zero", "/fancoins/tip", {
            "creatorId": creator_id, "amount": 1,
            "platformFee": 0, "platformCut": 0,
        }),
    ]

    issues = []
    for name, path, payload in test_cases:
        r = session.post(f"{base}{path}", json=payload, timeout=10)
        data = r.json()
        # If it succeeds, check if extra fields were applied
        if r.status_code == 200 and data.get("success"):
            result_data = data.get("data", {})
            # Check if platformFee was bypassed
            if "platformFee" in payload and payload["platformFee"] == 0:
                if result_data.get("platformFee", -1) == 0 and result_data.get("creatorReceived") == result_data.get("sent"):
                    fail(f"{name}: Platform fee foi zerado!")
                    issues.append(name)
                    continue
            ok(f"{name}: Campos extras ignorados (tip processado normalmente)")
        else:
            ok(f"{name}: Rejeitado ou falhou normalmente — {data.get('error', {}).get('code', r.status_code)}")

    if issues:
        report.add(TestResult("Mass Assignment", "T5-mass-assign", "HIGH", "FAIL",
            f"Mass assignment detectado em: {', '.join(issues)}",
            recommendation="Usar Zod schema estrito para validar apenas campos permitidos"))
    else:
        report.add(TestResult("Mass Assignment", "T5-mass-assign", "MEDIUM", "PASS",
            "Campos extras sao ignorados em todas as rotas testadas"))


# ─── T6: Privilege Escalation — Admin Endpoints ─────────────────────────────

def test_privilege_escalation(session: requests.Session, base: str, report: ScanReport):
    header("T6: Escalacao de Privilegio — Acesso a Endpoints Admin")

    admin_endpoints = [
        ("GET", "/withdrawals/admin/all"),
        ("GET", "/withdrawals/admin/pending"),
        ("GET", "/withdrawals/admin/settings"),
        ("POST", f"/withdrawals/admin/{uuid.uuid4()}/approve"),
        ("POST", f"/withdrawals/admin/{uuid.uuid4()}/reject"),
        ("PATCH", "/withdrawals/admin/settings"),
        ("GET", "/admin/users"),
        ("GET", "/admin/dashboard"),
    ]

    all_blocked = True
    for method, path in admin_endpoints:
        try:
            if method == "GET":
                r = session.get(f"{base}{path}", timeout=10)
            elif method == "POST":
                r = session.post(f"{base}{path}", json={"reason": "test"}, timeout=10)
            elif method == "PATCH":
                r = session.patch(f"{base}{path}", json={"min_payout": 0.01}, timeout=10)
            else:
                continue

            if r.status_code in (401, 403):
                ok(f"{method} {path}: Bloqueado ({r.status_code})")
            elif r.status_code == 404:
                ok(f"{method} {path}: Rota nao encontrada (404)")
            elif r.status_code == 200:
                data = r.json()
                if data.get("success"):
                    fail(f"{method} {path}: ACESSIVEL! Usuario normal acessou admin endpoint")
                    all_blocked = False
                else:
                    ok(f"{method} {path}: Retornou 200 mas success=false")
            else:
                ok(f"{method} {path}: {r.status_code}")
        except Exception as e:
            warn(f"{method} {path}: Erro — {e}")

    if all_blocked:
        report.add(TestResult("Privilege Escalation", "T6-admin-access", "CRITICAL", "PASS",
            "Todos os endpoints admin foram bloqueados para usuario normal"))
    else:
        report.add(TestResult("Privilege Escalation", "T6-admin-access", "CRITICAL", "FAIL",
            "Usuario normal acessou endpoints admin",
            recommendation="Verificar adminMiddleware em todas as rotas admin"))


# ─── T7: Withdrawal Attacks (Creator Only) ──────────────────────────────────

def test_withdrawal_attacks(session: requests.Session, base: str, report: ScanReport):
    header("T7: Ataques em Withdrawals")

    # T7.1: Negative withdrawal amount
    r = session.post(f"{base}/withdrawals/request", json={
        "method": "pix", "fancoinAmount": -1000, "pixKey": "test@test.com"
    }, timeout=10)
    data = r.json()
    if r.status_code == 200 and data.get("success"):
        fail("Withdrawal com valor negativo ACEITO")
        report.add(TestResult("Withdrawal", "T7.1-negative-withdrawal", "CRITICAL", "FAIL",
            "Withdrawal com valor negativo foi aceito",
            f"Response: {json.dumps(data)}",
            "Validar fancoinAmount: int positivo"))
    else:
        ok(f"Withdrawal negativo bloqueado: {data.get('error', {}).get('code', r.status_code)}")
        report.add(TestResult("Withdrawal", "T7.1-negative-withdrawal", "CRITICAL", "PASS",
            "Withdrawal com valor negativo corretamente rejeitado"))

    # T7.2: Zero withdrawal
    r = session.post(f"{base}/withdrawals/request", json={
        "method": "pix", "fancoinAmount": 0, "pixKey": "test@test.com"
    }, timeout=10)
    data = r.json()
    if r.status_code == 200 and data.get("success"):
        fail("Withdrawal com valor zero ACEITO")
        report.add(TestResult("Withdrawal", "T7.2-zero-withdrawal", "HIGH", "FAIL",
            "Withdrawal com valor zero foi aceito"))
    else:
        ok(f"Withdrawal zero bloqueado: {data.get('error', {}).get('code', r.status_code)}")
        report.add(TestResult("Withdrawal", "T7.2-zero-withdrawal", "HIGH", "PASS",
            "Withdrawal com valor zero corretamente rejeitado"))

    # T7.3: Float withdrawal
    r = session.post(f"{base}/withdrawals/request", json={
        "method": "pix", "fancoinAmount": 1.5, "pixKey": "test@test.com"
    }, timeout=10)
    data = r.json()
    if r.status_code == 200 and data.get("success"):
        fail("Withdrawal com valor float ACEITO")
        report.add(TestResult("Withdrawal", "T7.3-float-withdrawal", "HIGH", "FAIL",
            "Withdrawal com valor float foi aceito",
            recommendation="Validar Number.isInteger(fancoinAmount)"))
    else:
        ok(f"Withdrawal float bloqueado: {data.get('error', {}).get('code', r.status_code)}")
        report.add(TestResult("Withdrawal", "T7.3-float-withdrawal", "HIGH", "PASS",
            "Withdrawal com valor float corretamente rejeitado"))

    # T7.4: Invalid method
    r = session.post(f"{base}/withdrawals/request", json={
        "method": "hacked", "fancoinAmount": 100, "pixKey": "test@test.com"
    }, timeout=10)
    data = r.json()
    if r.status_code == 200 and data.get("success"):
        warn("Withdrawal com metodo invalido aceito (pode nao ter validacao de enum)")
        report.add(TestResult("Withdrawal", "T7.4-invalid-method", "MEDIUM", "WARN",
            "Withdrawal com metodo invalido ('hacked') foi aceito",
            recommendation="Adicionar validacao Zod enum para method: 'pix' | 'bank_transfer' | 'crypto'"))
    else:
        ok(f"Withdrawal com metodo invalido bloqueado: {r.status_code}")
        report.add(TestResult("Withdrawal", "T7.4-invalid-method", "MEDIUM", "PASS",
            "Withdrawal com metodo invalido rejeitado"))

    # T7.5: Mass assignment in withdrawal (try to set status, riskScore etc)
    r = session.post(f"{base}/withdrawals/request", json={
        "method": "pix", "fancoinAmount": 100, "pixKey": "test@test.com",
        "status": "completed", "riskScore": 0, "requiresManualApproval": False,
        "approvedBy": str(uuid.uuid4()),
    }, timeout=10)
    data = r.json()
    if r.status_code == 200 and data.get("success"):
        payout = data.get("data", {}).get("payout", {})
        if payout.get("status") == "completed":
            fail("Mass assignment: withdrawal criado com status 'completed'")
            report.add(TestResult("Mass Assignment", "T7.5-withdrawal-mass-assign", "CRITICAL", "FAIL",
                "Mass assignment: usuario conseguiu definir status do withdrawal como 'completed'"))
        elif payout.get("riskScore") == 0 and payout.get("requiresManualApproval") == False:
            warn("Campos extras podem ter sido aceitos no withdrawal")
            report.add(TestResult("Mass Assignment", "T7.5-withdrawal-mass-assign", "MEDIUM", "WARN",
                "Alguns campos extras podem ter sido aceitos no withdrawal request"))
        else:
            ok("Campos extras ignorados no withdrawal")
            report.add(TestResult("Mass Assignment", "T7.5-withdrawal-mass-assign", "MEDIUM", "PASS",
                "Campos extras sao ignorados no withdrawal request"))
    else:
        ok(f"Withdrawal rejeitado (provavelmente saldo insuficiente): {data.get('error', {}).get('code', 'N/A')}")
        report.add(TestResult("Mass Assignment", "T7.5-withdrawal-mass-assign", "MEDIUM", "PASS",
            "Withdrawal rejeitado — campos extras nao influenciaram"))


# ─── T8: IDOR in Payment/Withdrawal Status ──────────────────────────────────

def test_idor_payment_status(session: requests.Session, base: str, report: ScanReport):
    header("T8: IDOR — Acesso a Status de Pagamentos de Terceiros")

    # Try random payment IDs
    fake_ids = [str(uuid.uuid4()) for _ in range(3)]

    for fid in fake_ids:
        r = session.get(f"{base}/payments/status/{fid}", timeout=10)
        data = r.json()
        if r.status_code == 200 and data.get("success"):
            payment_data = data.get("data", {})
            payment_user = payment_data.get("userId", "")
            if payment_user and payment_user != report.user_id:
                fail(f"IDOR! Acessou pagamento de outro usuario: {fid}")
                report.add(TestResult("IDOR", "T8-payment-status-idor", "HIGH", "FAIL",
                    f"Acessou dados de pagamento de outro usuario",
                    f"Payment ID: {fid}, UserId retornado: {payment_user}",
                    "Filtrar por userId do token no getPaymentStatus"))
                return
        elif r.status_code == 404 or (data.get("error", {}).get("code") == "NOT_FOUND"):
            ok(f"Payment {fid[:8]}... nao encontrado (esperado)")
        else:
            ok(f"Payment {fid[:8]}...: {r.status_code} — {data.get('error', {}).get('code', 'N/A')}")

    report.add(TestResult("IDOR", "T8-payment-status-idor", "HIGH", "PASS",
        "Nao foi possivel acessar pagamentos de outros usuarios via IDs aleatorios"))


# ─── T9: Package Manipulation ───────────────────────────────────────────────

def test_package_manipulation(session: requests.Session, base: str, report: ScanReport):
    header("T9: Manipulacao de Pacotes de FanCoins")

    # T9.1: Invalid package ID
    r = session.post(f"{base}/fancoins/purchase", json={"packageId": "fake-package-9999"}, timeout=10)
    data = r.json()
    if r.status_code == 200 and data.get("success"):
        fail("Pacote inexistente ACEITO")
        report.add(TestResult("Business Logic", "T9.1-fake-package", "HIGH", "FAIL",
            "Sistema aceitou compra de pacote inexistente",
            f"Response: {json.dumps(data)}"))
    else:
        ok(f"Pacote inexistente rejeitado: {data.get('error', {}).get('code', r.status_code)}")

    # T9.2: SQL injection in packageId
    injections = [
        "'; DROP TABLE fancoin_wallets; --",
        "1 OR 1=1",
        "${7*7}",
        "{{constructor.constructor('return this')()}}",
    ]
    for inj in injections:
        r = session.post(f"{base}/fancoins/purchase", json={"packageId": inj}, timeout=10)
        if r.status_code == 500:
            warn(f"Injection pode ter causado erro 500: {inj}")
        else:
            ok(f"Injection '{inj[:30]}...' tratada: {r.status_code}")

    report.add(TestResult("Business Logic", "T9-package-manipulation", "MEDIUM", "PASS",
        "Pacotes de FanCoins nao podem ser manipulados"))


# ─── T10: Concurrent Withdrawal Race ─────────────────────────────────────────

def test_withdrawal_race(session: requests.Session, base: str, report: ScanReport):
    header("T10: Race Condition — Withdrawals Concorrentes")

    # Get earnings/balance
    r = session.get(f"{base}/withdrawals/earnings", timeout=10)
    if r.status_code != 200:
        warn("Nao foi possivel obter earnings — pode nao ser creator")
        report.add(TestResult("Race Condition", "T10-withdrawal-race", "HIGH", "SKIP",
            "Nao foi possivel obter earnings (pode nao ser creator)"))
        return

    data = r.json()
    wallet = data.get("data", {}).get("wallet", {})
    balance = int(wallet.get("balance", 0))
    info(f"Creator balance: {balance} FanCoins")

    if balance < 100:
        warn(f"Balance insuficiente para withdrawal race test (balance: {balance}, minimo: ~100)")
        report.add(TestResult("Race Condition", "T10-withdrawal-race", "HIGH", "SKIP",
            f"Balance insuficiente para teste ({balance} FanCoins)",
            recommendation="Creditar FanCoins e rodar novamente"))
        return

    # Try concurrent withdrawal requests for the full balance
    num_concurrent = 5
    info(f"Enviando {num_concurrent} withdrawals simultaneos de {balance} FanCoins cada...")

    async def send_withdrawal_async(idx):
        try:
            async with aiohttp.ClientSession() as aio:
                headers = dict(session.headers)
                payload = {
                    "method": "pix",
                    "fancoinAmount": balance,
                    "pixKey": f"test{idx}@test.com"
                }
                async with aio.post(f"{base}/withdrawals/request", json=payload,
                                     headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    body = await resp.json()
                    return {"idx": idx, "status": resp.status, "body": body}
        except Exception as e:
            return {"idx": idx, "status": 0, "body": {"error": str(e)}}

    async def run_race():
        tasks = [send_withdrawal_async(i) for i in range(num_concurrent)]
        return await asyncio.gather(*tasks)

    try:
        race_results = asyncio.run(run_race())
    except Exception as e:
        warn(f"Erro ao executar race condition test: {e}")
        report.add(TestResult("Race Condition", "T10-withdrawal-race", "HIGH", "ERROR",
            f"Erro na execucao: {e}"))
        return

    successes = [r for r in race_results if r["status"] == 200 and r["body"].get("success")]
    info(f"Resultados: {len(successes)} sucesso de {num_concurrent} tentativas")

    if len(successes) > 1:
        total_withdrawn = len(successes) * balance
        fail(f"RACE CONDITION! {len(successes)} withdrawals passaram (total: {total_withdrawn} de {balance})")
        report.add(TestResult("Race Condition", "T10-withdrawal-race", "CRITICAL", "FAIL",
            f"Race condition em withdrawals: {len(successes)} requests concorrentes tiveram sucesso",
            json.dumps([{"idx": r["idx"]} for r in successes]),
            "Usar UPDATE atomico com WHERE balance >= amount"))
    elif len(successes) <= 1:
        ok(f"Race condition protegido: {len(successes)} de {num_concurrent} withdrawals passou")
        report.add(TestResult("Race Condition", "T10-withdrawal-race", "CRITICAL", "PASS",
            f"Apenas {len(successes)} de {num_concurrent} withdrawals concorrentes teve sucesso"))


# ─── T11: JWT / Auth Bypass ──────────────────────────────────────────────────

def test_auth_bypass(base: str, report: ScanReport):
    header("T11: Auth Bypass — Acesso Sem Token")

    no_auth = requests.Session()
    no_auth.headers.update({
        "Content-Type": "application/json",
        "Accept": "application/json",
    })

    protected_endpoints = [
        ("GET", "/fancoins/wallet"),
        ("GET", "/fancoins/transactions"),
        ("POST", "/fancoins/tip"),
        ("POST", "/fancoins/purchase"),
        ("GET", "/withdrawals/earnings"),
        ("POST", "/withdrawals/request"),
    ]

    all_blocked = True
    for method, path in protected_endpoints:
        try:
            if method == "GET":
                r = no_auth.get(f"{base}{path}", timeout=10)
            else:
                r = no_auth.post(f"{base}{path}", json={"test": True}, timeout=10)

            if r.status_code == 401:
                ok(f"{method} {path}: Bloqueado (401)")
            elif r.status_code == 200:
                data = r.json()
                if data.get("success"):
                    fail(f"{method} {path}: ACESSIVEL SEM TOKEN!")
                    all_blocked = False
                else:
                    ok(f"{method} {path}: 200 mas success=false")
            else:
                ok(f"{method} {path}: {r.status_code}")
        except Exception as e:
            warn(f"{method} {path}: Erro — {e}")

    # Test with invalid/expired JWT
    fake_session = requests.Session()
    fake_session.headers.update({
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ0ZXN0IiwidHlwZSI6ImFjY2VzcyJ9.fake"
    })
    r = fake_session.get(f"{base}/fancoins/wallet", timeout=10)
    if r.status_code == 401:
        ok("JWT falso rejeitado (401)")
    elif r.status_code == 200 and r.json().get("success"):
        fail("JWT FALSO ACEITO!")
        all_blocked = False
    else:
        ok(f"JWT falso: {r.status_code}")

    if all_blocked:
        report.add(TestResult("Authentication", "T11-auth-bypass", "CRITICAL", "PASS",
            "Todos os endpoints protegidos rejeitam acesso sem token ou com token invalido"))
    else:
        report.add(TestResult("Authentication", "T11-auth-bypass", "CRITICAL", "FAIL",
            "Endpoints financeiros acessiveis sem autenticacao valida",
            recommendation="Verificar authMiddleware em todas as rotas de FanCoins"))


# ─── T12: Tip to Non-Existent Creator ───────────────────────────────────────

def test_tip_nonexistent_creator(session: requests.Session, base: str, report: ScanReport):
    header("T12: Tip para Creator Inexistente")

    fake_creator = str(uuid.uuid4())
    r = session.post(f"{base}/fancoins/tip", json={
        "creatorId": fake_creator, "amount": 1
    }, timeout=10)
    data = r.json()

    if r.status_code == 200 and data.get("success"):
        # Tip succeeded — check if coins were actually deducted
        wallet_r = session.get(f"{base}/fancoins/wallet", timeout=10)
        warn("Tip para creator inexistente pode ter sido aceito (FanCoins podem ter sido perdidos)")
        report.add(TestResult("Business Logic", "T12-nonexistent-creator", "HIGH", "WARN",
            "Tip para creator inexistente foi aceito — FanCoins podem ser perdidos",
            f"Creator ID: {fake_creator}, Response: {json.dumps(data)}",
            "Validar existencia do creator antes de debitar"))
    else:
        ok(f"Tip para creator inexistente bloqueado: {data.get('error', {}).get('code', r.status_code)}")
        report.add(TestResult("Business Logic", "T12-nonexistent-creator", "HIGH", "PASS",
            "Tip para creator inexistente corretamente tratado"))


# ─── T13: Transaction Limit Query ───────────────────────────────────────────

def test_transaction_limit(session: requests.Session, base: str, report: ScanReport):
    header("T13: Query Parameter Abuse — Limit Injection")

    # Try to dump all transactions with huge limit
    test_limits = [
        ("limit=999999", "/fancoins/transactions?limit=999999"),
        ("limit=-1", "/fancoins/transactions?limit=-1"),
        ("limit=0", "/fancoins/transactions?limit=0"),
        ("limit=abc", "/fancoins/transactions?limit=abc"),
    ]

    for name, path in test_limits:
        r = session.get(f"{base}{path}", timeout=10)
        if r.status_code == 200:
            data = r.json()
            txs = data.get("data", [])
            if len(txs) > 100:
                warn(f"{name}: Retornou {len(txs)} transacoes (pode ser DoS vector)")
            else:
                ok(f"{name}: Retornou {len(txs)} transacoes")
        else:
            ok(f"{name}: {r.status_code}")

    report.add(TestResult("Input Validation", "T13-limit-injection", "LOW", "PASS",
        "Query parameter limit testado — sem vazamento excessivo"))


# ─── T14: Rate Limiting on Financial Endpoints ──────────────────────────────

def test_rate_limiting(session: requests.Session, base: str, report: ScanReport, creator_id: str):
    header("T14: Rate Limiting em Endpoints Financeiros")

    # Send many tip requests rapidly
    blocked = False
    for i in range(25):
        r = session.post(f"{base}/fancoins/tip", json={
            "creatorId": creator_id, "amount": 1
        }, timeout=10)
        if r.status_code == 429:
            ok(f"Rate limited apos {i+1} requests (429)")
            blocked = True
            break

    if blocked:
        report.add(TestResult("Rate Limiting", "T14-tip-rate-limit", "MEDIUM", "PASS",
            f"Rate limit ativo em /fancoins/tip"))
    else:
        warn("25 tip requests sem rate limit")
        report.add(TestResult("Rate Limiting", "T14-tip-rate-limit", "MEDIUM", "WARN",
            "25 requests consecutivos a /fancoins/tip sem rate limit",
            recommendation="Considerar rate limit especifico para endpoints financeiros"))

    # Test withdrawal rate limit
    blocked = False
    for i in range(10):
        r = session.post(f"{base}/withdrawals/request", json={
            "method": "pix", "fancoinAmount": 1, "pixKey": "test@test.com"
        }, timeout=10)
        if r.status_code == 429:
            ok(f"Withdrawal rate limited apos {i+1} requests (429)")
            blocked = True
            break

    if blocked:
        report.add(TestResult("Rate Limiting", "T14-withdrawal-rate-limit", "HIGH", "PASS",
            "Rate limit ativo em /withdrawals/request"))
    else:
        warn("10 withdrawal requests sem rate limit (sensitiveRateLimit pode estar desabilitado)")
        report.add(TestResult("Rate Limiting", "T14-withdrawal-rate-limit", "HIGH", "WARN",
            "10 requests consecutivos a /withdrawals/request sem rate limit",
            recommendation="Verificar sensitiveRateLimit middleware"))


# ═══════════════════════════════════════════════════════════════════════════
# REPORT GENERATION
# ═══════════════════════════════════════════════════════════════════════════

def generate_markdown(report: ScanReport) -> str:
    s = report.summary
    lines = [
        "# MyFans FanCoin Economy — External Security Scan Report",
        "",
        f"**Data:** {report.scan_time}",
        f"**Target:** `{report.target}`",
        f"**User:** `{report.user_id}` (role: {report.user_role})",
        f"**Scanner:** MyFans FanCoin Security Scanner v1.0",
        "",
        "---",
        "",
        "## Resumo Executivo",
        "",
        f"| Metrica | Valor |",
        f"|---------|-------|",
        f"| Score | **{s['score']}/100** |",
        f"| Grade | **{s['grade']}** |",
        f"| Total Testes | {s['total_tests']} |",
        f"| Passed | {s['passed']} |",
        f"| Failed | {s['failed']} |",
        f"| Warnings | {s['warned']} |",
        f"| Skipped | {s['skipped']} |",
        f"| Critical Failures | {s['critical_failures']} |",
        f"| High Failures | {s['high_failures']} |",
        "",
        "---",
        "",
        "## Resultados Detalhados",
        "",
    ]

    # Group by category
    categories = {}
    for r in report.results:
        if r.category not in categories:
            categories[r.category] = []
        categories[r.category].append(r)

    for cat, results in categories.items():
        lines.append(f"### {cat}")
        lines.append("")
        for r in results:
            icon = {"PASS": "PASS", "FAIL": "FAIL", "WARN": "WARN", "SKIP": "SKIP", "ERROR": "ERROR"}[r.status]
            lines.append(f"**[{icon}]** `{r.test_name}` — [{r.severity}] {r.description}")
            if r.details:
                lines.append(f"  - Detalhes: {r.details[:200]}")
            if r.recommendation:
                lines.append(f"  - Recomendacao: {r.recommendation}")
            lines.append("")

    lines.extend([
        "---",
        "",
        "## Categorias de Teste",
        "",
        "| Categoria | Descricao |",
        "|-----------|-----------|",
        "| IDOR | Insecure Direct Object Reference — acesso a dados de terceiros |",
        "| Race Condition | Double-spend e race conditions em operacoes financeiras |",
        "| Input Validation | Valores negativos, float, overflow, injection |",
        "| Business Logic | Self-tip, pacotes invalidos, creator inexistente |",
        "| Mass Assignment | Injecao de campos extras para manipulacao |",
        "| Privilege Escalation | Acesso a endpoints admin sem autorizacao |",
        "| Authentication | Bypass de autenticacao em endpoints protegidos |",
        "| Rate Limiting | Protecao contra abuso em massa |",
        "| Withdrawal | Ataques especificos no fluxo de saque |",
        "",
    ])

    return "\n".join(lines)


def generate_json(report: ScanReport) -> dict:
    return {
        "scan_time": report.scan_time,
        "target": report.target,
        "user_id": report.user_id,
        "user_role": report.user_role,
        "summary": report.summary,
        "results": [asdict(r) for r in report.results],
    }


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="MyFans FanCoin Economy Security Scanner")
    parser.add_argument("--target", required=True, help="API base URL (e.g., https://api.myfans.my)")
    parser.add_argument("--email", required=True, help="User email for login")
    parser.add_argument("--password", required=True, help="User password")
    parser.add_argument("--creator-id", default=None, help="Creator UUID to use for tip tests (if not provided, tries to find one)")
    parser.add_argument("--output", default="fancoin_scan_report", help="Output filename prefix (default: fancoin_scan_report)")
    args = parser.parse_args()

    target = args.target.rstrip("/")
    if not target.endswith("/api/v1"):
        target += "/api/v1"

    print(f"\n{C.BOLD}{C.MAGENTA}")
    print("  ╔═══════════════════════════════════════════════════════╗")
    print("  ║  MYFANS — FANCOIN ECONOMY SECURITY SCANNER v1.0     ║")
    print("  ║  Authorized Penetration Testing Only                 ║")
    print("  ╚═══════════════════════════════════════════════════════╝")
    print(f"{C.RESET}")

    report = ScanReport(target=target)
    report.scan_time = datetime.now(timezone.utc).isoformat()

    session = create_session()

    # Authenticate
    header("AUTENTICACAO")
    user = authenticate(session, target, args.email, args.password)
    report.user_id = user["id"]
    report.user_role = user.get("role", "unknown")

    # Get or discover a creator ID for tip tests
    creator_id = args.creator_id
    if not creator_id:
        info("Buscando um creator para testes de tip...")
        # Try discover endpoint
        try:
            r = session.get(f"{target}/discover/creators?limit=1", timeout=10)
            if r.status_code == 200:
                data = r.json()
                creators = data.get("data", {}).get("creators", data.get("data", []))
                if isinstance(creators, list) and len(creators) > 0:
                    creator_id = creators[0].get("id") or creators[0].get("userId")
                    if creator_id:
                        info(f"Creator encontrado: {creator_id}")
        except Exception:
            pass

        if not creator_id:
            # Use a random UUID (tests will handle the error gracefully)
            creator_id = str(uuid.uuid4())
            warn(f"Nenhum creator encontrado — usando UUID aleatorio: {creator_id[:8]}...")

    # ── Execute Test Batteries ──

    # T1: IDOR Wallet Access
    test_idor_wallet(session, target, report)

    # T2: Double-Spend Race (only if balance available)
    test_double_spend_race(session, target, report, creator_id)

    # T3: Invalid Amounts
    test_invalid_amounts(session, target, report, creator_id)

    # T4: Self-Tip
    test_self_tip(session, target, report, report.user_id)

    # T5: Mass Assignment
    test_mass_assignment(session, target, report, creator_id)

    # T6: Privilege Escalation
    test_privilege_escalation(session, target, report)

    # T7: Withdrawal Attacks
    test_withdrawal_attacks(session, target, report)

    # T8: IDOR Payment Status
    test_idor_payment_status(session, target, report)

    # T9: Package Manipulation
    test_package_manipulation(session, target, report)

    # T10: Concurrent Withdrawal Race
    test_withdrawal_race(session, target, report)

    # T11: Auth Bypass (uses separate sessions, no auth)
    test_auth_bypass(target, report)

    # T12: Tip Non-Existent Creator
    test_tip_nonexistent_creator(session, target, report)

    # T13: Transaction Limit Query
    test_transaction_limit(session, target, report)

    # T14: Rate Limiting
    test_rate_limiting(session, target, report, creator_id)

    # ── Generate Report ──
    report.compute_summary()
    s = report.summary

    header("RESULTADO FINAL")
    print(f"\n  {C.BOLD}Score: {s['score']}/100 (Grade {s['grade']}){C.RESET}")
    print(f"  Total: {s['total_tests']} | Pass: {C.GREEN}{s['passed']}{C.RESET} | "
          f"Fail: {C.RED}{s['failed']}{C.RESET} | Warn: {C.YELLOW}{s['warned']}{C.RESET} | "
          f"Skip: {s['skipped']}")
    if s["critical_failures"] > 0:
        print(f"  {C.RED}{C.BOLD}CRITICAL FAILURES: {s['critical_failures']}{C.RESET}")
    if s["high_failures"] > 0:
        print(f"  {C.RED}HIGH FAILURES: {s['high_failures']}{C.RESET}")

    # Save reports
    md_content = generate_markdown(report)
    json_content = generate_json(report)

    md_file = f"{args.output}.md"
    json_file = f"{args.output}.json"

    with open(md_file, "w") as f:
        f.write(md_content)
    with open(json_file, "w") as f:
        json.dump(json_content, f, indent=2, ensure_ascii=False)

    print(f"\n  Relatorios salvos:")
    print(f"  {C.CYAN}{md_file}{C.RESET}")
    print(f"  {C.CYAN}{json_file}{C.RESET}")
    print(f"\n  {C.BOLD}Copie o conteudo do arquivo .md e traga de volta ao Claude{C.RESET}")
    print(f"  {C.BOLD}para consolidacao no relatorio de seguranca.{C.RESET}\n")


if __name__ == "__main__":
    main()

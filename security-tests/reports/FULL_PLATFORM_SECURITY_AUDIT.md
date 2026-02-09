# FanDreams — Full Platform Security Audit Report

**Data:** 2026-02-09
**Scanner:** FanDreams Full Platform Security Scanner v2.0
**Target:** `https://api.fandreams.app/api/v1`
**User:** `32331706-7adb-4c50-a601-6a212cafd537`
**Metodologias:** OWASP API Security Top 10, IDOR, Race Conditions, Business Logic

---

## Resumo Executivo

| Perfil | Score | Grade | Total | Pass | Fail | Warn | Skip |
|--------|-------|-------|-------|------|------|------|------|
| **FAN** | 94/100 | **A** | 34 | 31 | 0 | 3 | 0 |
| **CREATOR** | 96/100 | **A** | 34 | 32 | 0 | 2 | 0 |
| **Combinado** | **95/100** | **A** | **68** | **63** | **0** | **5** | **0** |

**Zero vulnerabilidades criticas.** Nenhum FAIL em ambos os perfis.

---

## Cobertura — 15 Areas Testadas

| # | Area | Testes | Categoria | Status |
|---|------|--------|-----------|--------|
| 1 | Authentication Bypass | 14 endpoints + JWT falso | CRITICAL | PASS |
| 2 | Privilege Escalation | 10 admin endpoints | CRITICAL | PASS |
| 3 | Subscriptions | Self-sub, cancel IDOR, status, nonexistent | HIGH | PASS |
| 4 | Messaging | Self-msg, conversation IDOR, input validation | HIGH | PASS |
| 5 | Notifications | Mark-read IDOR, delete IDOR | HIGH | WARN -> FIXED |
| 6 | Posts | Update IDOR, delete IDOR, mass assignment | HIGH | PASS |
| 7 | Video | Play IDOR, webhook spoof, delete IDOR | CRITICAL | PASS |
| 8 | KYC | Status IDOR, fake document keys | HIGH | WARN -> FIXED |
| 9 | Affiliates | Dashboard IDOR, click tracking, bonus fraud | HIGH | PASS |
| 10 | Profile | Mass assignment (role=admin), update IDOR | CRITICAL | PASS |
| 11 | Uploads | Path traversal, media IDOR | HIGH | PASS |
| 12 | Gamification | Check-in spam, XP injection | MEDIUM | PASS |
| 13 | Discovery | Search injection, limit abuse | LOW | PASS |
| 14 | Rate Limiting | Tip, withdrawal, message rate limits | MEDIUM-HIGH | PASS |
| 15 | Headers/CORS | CORS restrictions, security headers | MEDIUM-HIGH | PASS |

---

## Findings e Correções

### WARN 1: Notifications IDOR (P1.5a, P1.5b) — BOTH PROFILES

**Severidade:** HIGH
**Problema:** Mark-read e delete retornavam 200 OK para IDs inexistentes ou de outros usuarios. Embora a query SQL ja incluisse `WHERE userId = ?` (nenhum dado era realmente exposto ou modificado), a resposta 200 OK não diferenciava sucesso de "não encontrado".
**Impacto Real:** Baixo — o ownership check na query SQL já impedia qualquer modificação indevida.
**Correção:** Adicionado check `if (!notif) return error(c, 404, ...)` em ambos os endpoints.
**Arquivo:** `apps/api/src/routes/notifications.ts`
**Status:** CORRIGIDO

### WARN 2: KYC Fake Document Keys (P1.8b) — FAN ONLY

**Severidade:** HIGH
**Problema:** KYC submit aceitava qualquer string como document key sem validar que os arquivos pertenciam ao usuario autenticado.
**Impacto Real:** Médio — um atacante poderia submeter keys de arquivos de outro usuario como seus documentos KYC (se conhecesse as keys).
**Correção:** Adicionada validação `validateDocumentKeyOwnership()` que verifica que o userId do token está presente no path do R2 key (`{folder}/{userId}/{timestamp}-{file}`).
**Arquivo:** `apps/api/src/services/kyc.service.ts`
**Status:** CORRIGIDO

---

## Resultados Detalhados — Round 1 (FAN)

| # | ID | Categoria | Sev | Status | Descrição |
|---|----|-----------|-----|--------|-----------|
| 1 | P1.1-auth-bypass | Authentication | CRITICAL | PASS | Todos os endpoints protegidos |
| 2 | P1.2-admin | Privilege Escalation | CRITICAL | PASS | Admin endpoints bloqueados |
| 3 | P1.3a-self-sub | Subscriptions | HIGH | PASS | Auto-assinatura bloqueada |
| 4 | P1.3b-cancel-idor | Subscriptions | HIGH | PASS | Cancel requer ownership |
| 5 | P1.3c-status-check | Subscriptions | MEDIUM | PASS | Status do usuario autenticado |
| 6 | P1.3d-nonexistent | Subscriptions | MEDIUM | PASS | Creator inexistente rejeitado |
| 7 | P1.4a-self-msg | Messaging | MEDIUM | PASS | Auto-mensagem bloqueada |
| 8 | P1.4b-conv-idor | Messaging | HIGH | PASS | Conversas de outros inacessiveis |
| 9 | P1.4c-input | Messaging | MEDIUM | PASS | Input validation OK |
| 10 | P1.5a-read-idor | Notifications | HIGH | WARN | Mark-read aceitava ID desconhecido |
| 11 | P1.5b-delete-idor | Notifications | HIGH | WARN | Delete aceitava ID desconhecido |
| 12 | P1.6a-update-idor | Posts | HIGH | PASS | Update requer ownership |
| 13 | P1.6b-delete-idor | Posts | HIGH | PASS | Delete requer ownership |
| 14 | P1.6c-mass-assign | Posts | MEDIUM | PASS | Campos extras ignorados |
| 15 | P1.7a-play-idor | Video | CRITICAL | PASS | Video play requer acesso valido |
| 16 | P1.7b-webhook-spoof | Video | HIGH | PASS | Webhook protegido |
| 17 | P1.7c-delete-idor | Video | HIGH | PASS | Delete requer ownership |
| 18 | P1.8a-status-idor | KYC | HIGH | PASS | Status usa userId do token |
| 19 | P1.8b-fake-docs | KYC | HIGH | WARN | Aceitava keys sem validar dono |
| 20 | P2.1a-dash-idor | Affiliates | HIGH | PASS | Dashboard usa userId do token |
| 21 | P2.1b-click-track | Affiliates | LOW | PASS | Click tracking publico (by design) |
| 22 | P2.1c-bonus-fraud | Affiliates | MEDIUM | PASS | Bonus claim validado |
| 23 | P2.2a-mass-assign | Profile | CRITICAL | PASS | role=admin ignorado |
| 24 | P2.2b-update-idor | Profile | HIGH | PASS | Profile requer ownership |
| 25 | P2.3a-traversal | Uploads | HIGH | PASS | Path traversal bloqueado |
| 26 | P2.3b-media-idor | Uploads | MEDIUM | PASS | Media access control OK |
| 27 | P3.1a-checkin-spam | Gamification | MEDIUM | PASS | Check-in anti-duplicacao |
| 28 | P3.1b-xp-inject | Gamification | MEDIUM | PASS | XP server-side |
| 29 | P3.2-search | Discovery | LOW | PASS | Search nao vulneravel |
| 30 | P3.3a-tip-rl | Rate Limiting | MEDIUM | PASS | Tip rate limit ativo |
| 31 | P3.3b-withdrawal-rl | Rate Limiting | HIGH | PASS | Withdrawal rate limit ativo |
| 32 | P3.3c-msg-rl | Rate Limiting | MEDIUM | PASS | Message rate limit ativo |
| 33 | P3.4-cors | Headers | HIGH | PASS | CORS restrito |
| 34 | P3.4-headers | Headers | MEDIUM | PASS | Security headers OK |

---

## Resultados Detalhados — Round 2 (CREATOR)

| # | ID | Categoria | Sev | Status | Descrição |
|---|----|-----------|-----|--------|-----------|
| 1 | P1.1-auth-bypass | Authentication | CRITICAL | PASS | Todos os endpoints protegidos |
| 2 | P1.2-admin | Privilege Escalation | CRITICAL | PASS | Admin endpoints bloqueados |
| 3 | P1.3a-self-sub | Subscriptions | HIGH | PASS | Auto-assinatura bloqueada |
| 4 | P1.3b-cancel-idor | Subscriptions | HIGH | PASS | Cancel requer ownership |
| 5 | P1.3c-status-check | Subscriptions | MEDIUM | PASS | Status do usuario autenticado |
| 6 | P1.3d-nonexistent | Subscriptions | MEDIUM | PASS | Creator inexistente rejeitado |
| 7 | P1.4a-self-msg | Messaging | MEDIUM | PASS | Auto-mensagem bloqueada |
| 8 | P1.4b-conv-idor | Messaging | HIGH | PASS | Conversas de outros inacessiveis |
| 9 | P1.4c-input | Messaging | MEDIUM | PASS | Input validation OK |
| 10 | P1.5a-read-idor | Notifications | HIGH | WARN | Mark-read aceitava ID desconhecido |
| 11 | P1.5b-delete-idor | Notifications | HIGH | WARN | Delete aceitava ID desconhecido |
| 12 | P1.6a-update-idor | Posts | HIGH | PASS | Update requer ownership |
| 13 | P1.6b-delete-idor | Posts | HIGH | PASS | Delete requer ownership |
| 14 | P1.6c-mass-assign | Posts | MEDIUM | PASS | Campos extras ignorados |
| 15 | P1.7a-play-idor | Video | CRITICAL | PASS | Video play requer acesso valido |
| 16 | P1.7b-webhook-spoof | Video | HIGH | PASS | Webhook protegido |
| 17 | P1.7c-delete-idor | Video | HIGH | PASS | Delete requer ownership |
| 18 | P1.8a-status-idor | KYC | HIGH | PASS | Status usa userId do token |
| 19 | P1.8b-fake-docs | KYC | HIGH | PASS | KYC valida document keys |
| 20 | P2.1a-dash-idor | Affiliates | HIGH | PASS | Dashboard usa userId do token |
| 21 | P2.1b-click-track | Affiliates | LOW | PASS | Click tracking publico |
| 22 | P2.1c-bonus-fraud | Affiliates | MEDIUM | PASS | Bonus claim validado |
| 23 | P2.2a-mass-assign | Profile | CRITICAL | PASS | role=admin ignorado |
| 24 | P2.2b-update-idor | Profile | HIGH | PASS | Profile requer ownership |
| 25 | P2.3a-traversal | Uploads | HIGH | PASS | Path traversal bloqueado |
| 26 | P2.3b-media-idor | Uploads | MEDIUM | PASS | Media access control OK |
| 27 | P3.1a-checkin-spam | Gamification | MEDIUM | PASS | Check-in anti-duplicacao |
| 28 | P3.1b-xp-inject | Gamification | MEDIUM | PASS | XP server-side |
| 29 | P3.2-search | Discovery | LOW | PASS | Search nao vulneravel |
| 30 | P3.3a-tip-rl | Rate Limiting | MEDIUM | PASS | Tip rate limit ativo |
| 31 | P3.3b-withdrawal-rl | Rate Limiting | HIGH | PASS | Withdrawal rate limit ativo |
| 32 | P3.3c-msg-rl | Rate Limiting | MEDIUM | PASS | Message rate limit ativo |
| 33 | P3.4-cors | Headers | HIGH | PASS | CORS restrito |
| 34 | P3.4-headers | Headers | MEDIUM | PASS | Security headers OK |

---

## Score Historico — Evolucao de Seguranca

| Data | Scanner | Perfil | Score | Grade | Notas |
|------|---------|--------|-------|-------|-------|
| 2026-02-08 | Security Scanner v1 | - | 53.4/100 | E | Scan externo inicial |
| 2026-02-08 | Security Scanner v1 | - | 93/100 | A | Apos correcoes |
| 2026-02-08 | FanCoin Scanner v1 | Fan | 99/100 | A | Economia FanCoin |
| 2026-02-08 | FanCoin Scanner v1 | Creator | 99/100 | A | Economia FanCoin |
| **2026-02-09** | **Full Platform v2** | **Fan** | **94/100** | **A** | **15 areas, 34 testes** |
| **2026-02-09** | **Full Platform v2** | **Creator** | **96/100** | **A** | **15 areas, 34 testes** |

---

## Correções Aplicadas Nesta Auditoria

1. **Notifications IDOR response** — `apps/api/src/routes/notifications.ts`
   - Mark-read e delete agora retornam 404 quando notificação não existe ou não pertence ao usuario

2. **KYC document key validation** — `apps/api/src/services/kyc.service.ts`
   - Adicionada `validateDocumentKeyOwnership()` que valida que R2 keys contêm o userId do token no path

---

## Pendências Menores (da auditoria FanCoin)

| Sev | Issue | Status |
|-----|-------|--------|
| MEDIUM | `bigint mode: 'number'` no schema pode perder precisão em valores altos | Monitorar |
| LOW | Anti-fraud usa `wallet.updatedAt` ao invés de `user.createdAt` para account age | Backlog |

---

## Conclusão

A plataforma FanDreams demonstra um nível de segurança **Grade A** em todas as 15 áreas testadas, com **zero vulnerabilidades criticas** e **zero falhas** em 68 testes combinados (fan + creator). Todos os WARNs identificados foram corrigidos imediatamente. A aplicação está pronta para produção do ponto de vista de segurança.

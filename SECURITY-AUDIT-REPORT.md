# RELATÓRIO DE AUDITORIA DE SEGURANÇA — FanDreams

**Data:** 22 de Fevereiro de 2026
**Escopo:** Full-stack (Next.js Frontend + Hono API Backend + Database)
**Metodologia:** SAST, OWASP Top 10 2021, Análise de Lógica de Negócio, Revisão de Configuração
**Classificação:** Confidencial

---

## RESUMO EXECUTIVO

| Severidade | Quantidade | Status |
|------------|-----------|--------|
| **CRÍTICA** | 10 | Correção Imediata |
| **ALTA** | 15 | Correção em 48h |
| **MÉDIA** | 16 | Correção em 2 semanas |
| **BAIXA** | 11 | Correção em 1 mês |
| **TOTAL** | **52** | |

**Score de Risco Global: 8.2/10 (ALTO)**

A plataforma possui fundamentos sólidos (ORM parametrizado, bcrypt, rate limiting parcial, audit logging), porém apresenta **vulnerabilidades críticas em webhooks de pagamento, gestão de sessões e validação de entrada** que podem resultar em **fraude financeira, roubo de sessão e acesso não autorizado**.

---

## VULNERABILIDADES CRÍTICAS (CVSS 9.0-10.0)

### C01 — Bypass de Webhook MercadoPago (Fraude Financeira)
- **OWASP:** A07 — Falha de Autenticação
- **CVSS:** 9.8
- **Arquivo:** `apps/api/src/routes/payments.ts` (linhas 136-204)
- **Descrição:** Webhooks do MercadoPago são processados **sem verificação de assinatura** quando `MERCADOPAGO_WEBHOOK_SECRET` não está configurado. Em ambiente de desenvolvimento, webhooks unsigned são aceitos incondicionalmente (linha 189-196).
- **Impacto:** Atacante pode forjar webhooks para: marcar pagamentos pendentes como concluídos, creditar FanCoins ilimitados, ativar assinaturas gratuitas, desbloquear conteúdo PPV sem pagamento.
- **PoC:**
```bash
curl -X POST https://api.fandreams.com/api/v1/payments/webhook/mercadopago \
  -H "Content-Type: application/json" \
  -d '{"type":"payment","data":{"id":"FORGED_PAYMENT_ID"}}'
```
- **Correção:**
```typescript
// Rejeitar SEMPRE se assinatura inválida, independente do ambiente
if (!env.MERCADOPAGO_WEBHOOK_SECRET) {
  console.error('CRITICAL: MERCADOPAGO_WEBHOOK_SECRET not configured')
  return c.json({ error: 'webhook_not_configured' }, 500)
}
const isValid = verifyMercadoPagoSignature(rawBody, signatureHeader, env.MERCADOPAGO_WEBHOOK_SECRET)
if (!isValid) {
  return c.json({ error: 'invalid_signature' }, 401)
}
```

---

### C02 — Bypass de Webhook OpenPix (Fraude Financeira)
- **OWASP:** A07 — Falha de Autenticação
- **CVSS:** 9.8
- **Arquivo:** `apps/api/src/services/openpix.service.ts` (linhas 241-252)
- **Descrição:** A função `verifyWebhookSignature()` retorna `true` quando `OPENPIX_WEBHOOK_SECRET` não está configurado. Usa SHA1 (fraco) e comparação não timing-safe.
- **Impacto:** Idêntico ao C01 — fraude financeira completa via webhooks forjados.
- **Correção:**
```typescript
export function verifyWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  if (!env.OPENPIX_WEBHOOK_SECRET) {
    throw new Error('OPENPIX_WEBHOOK_SECRET is required')
  }
  if (!signatureHeader) return false

  const computed = crypto
    .createHmac('sha256', env.OPENPIX_WEBHOOK_SECRET) // SHA256 em vez de SHA1
    .update(rawBody)
    .digest('base64')

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader))
}
```

---

### C03 — Webhook PayPal SEM Verificação de Assinatura
- **OWASP:** A07 — Falha de Autenticação
- **CVSS:** 9.8
- **Arquivo:** `apps/api/src/routes/payments.ts` (linhas 289-298)
- **Descrição:** O endpoint de webhook do PayPal **não implementa nenhuma verificação de assinatura**. Qualquer requisição é processada como legítima.
- **Impacto:** Fraude financeira via webhooks forjados.
- **Correção:** Implementar verificação de assinatura PayPal usando `paypal-rest-sdk` ou verificação manual via API `verify-webhook-signature`.

---

### C04 — CPF Hardcoded em Pagamentos PIX
- **OWASP:** A05 — Configuração Incorreta
- **CVSS:** 9.1
- **Arquivo:** `apps/api/src/services/payment.service.ts` (linha 121)
- **Descrição:** Um CPF de teste fixo (`52998224725`) é enviado ao MercadoPago para **todos** os pagamentos PIX, em vez de coletar o CPF real do usuário via KYC.
- **Impacto:** Violação da LGPD, violação regulatória bancária, risco de suspensão da conta MercadoPago, impossibilidade de rastreamento de fraudes.
- **Correção:** Coletar CPF real durante KYC e usar na criação do pagamento.

---

### C05 — Senha Admin Padrão Hardcoded
- **OWASP:** A05 — Configuração Incorreta
- **CVSS:** 9.1
- **Arquivo:** `apps/api/src/scripts/create-admin.ts` (linhas 13-15)
- **Descrição:**
```typescript
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2024!'
```
Se `ADMIN_PASSWORD` não estiver definido, o script cria admin com senha previsível.
- **Impacto:** Acesso administrativo completo por qualquer pessoa que leia o código.
- **Correção:** Remover fallback, falhar com erro se variável não definida.

---

### C06 — Tokens em localStorage (Vulnerável a XSS)
- **OWASP:** A07 — Falha de Autenticação
- **CVSS:** 8.8
- **Arquivos:** `apps/web/src/lib/store.ts` (linhas 25-50), `apps/web/src/lib/api.ts` (linhas 21, 30, 74, 88)
- **Descrição:** Access token e refresh token são armazenados em `localStorage`, acessível por qualquer JavaScript na página. Qualquer vulnerabilidade XSS permite roubo de sessão completo.
- **Impacto:** Roubo de sessão, acesso à conta da vítima, transações financeiras não autorizadas.
- **Correção:** Migrar para httpOnly cookies:
```typescript
c.cookie('refreshToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth'
})
```

---

### C07 — Ausência de Proteção CSRF
- **OWASP:** A01 — Controle de Acesso Quebrado
- **CVSS:** 8.5
- **Arquivo:** `apps/api/src/index.ts` (linhas 81-93)
- **Descrição:** Nenhum mecanismo CSRF implementado. CORS permite credenciais (`credentials: true`) sem validação de token CSRF.
- **Impacto:** Operações state-changing (pagamentos, alteração de senha, exclusão de conta) podem ser executadas por sites maliciosos.
- **Correção:** Implementar CSRF token via double-submit cookie pattern ou SameSite=Strict.

---

### C08 — Blacklist de Tokens em Memória (Não Persistente)
- **OWASP:** A07 — Falha de Autenticação
- **CVSS:** 8.3
- **Arquivo:** `apps/api/src/utils/tokens.ts` (linhas 22-54)
- **Descrição:** Refresh tokens blacklisted são armazenados em `Map<>` em memória. Ao reiniciar o servidor, todos os tokens blacklisted voltam a ser válidos. Em deploy distribuído, cada instância tem blacklist diferente.
- **Impacto:** Logout não invalida sessões efetivamente; tokens comprometidos continuam válidos.
- **Correção:** Migrar blacklist para Redis (Upstash já disponível no projeto).

---

### C09 — Ausência de Atomicidade em Transações Financeiras
- **OWASP:** A04 — Design Inseguro
- **CVSS:** 8.2
- **Arquivo:** `apps/api/src/services/payment.service.ts` (linhas 836-1086)
- **Descrição:** A função `processPaymentConfirmation()` executa múltiplas operações sequenciais (marcar pagamento completo, creditar coins, incrementar earnings, atualizar perfil, distribuir comissões) **sem database transaction wrapping**.
- **Impacto:** Falha parcial resulta em estado inconsistente — pagamento marcado como completo mas coins não creditados, ou vice-versa.
- **Correção:**
```typescript
await db.transaction(async (tx) => {
  await tx.update(payments).set({ status: 'completed' })
  await creditPurchase(tx, ...)
  await creditEarnings(tx, ...)
  await distributeCommissions(tx, ...)
})
```

---

### C10 — Validação de Input Ausente em 15+ Endpoints
- **OWASP:** A08 — Falha de Integridade de Software/Dados
- **CVSS:** 8.0
- **Arquivos:** Múltiplos em `apps/api/src/routes/`
- **Descrição:** Os seguintes endpoints fazem `await c.req.json()` sem validação Zod:
  - `/auth/refresh` — sem validação de `refreshToken`
  - `/auth/verify-2fa` — sem validação de `challengeToken` ou `code`
  - `/auth/verify-email` — sem validação de `token`
  - `/payments/checkout/fancoins` — sem validação de `packageId`
  - `/payments/checkout/fancoins/custom` — sem validação de `amountBrl`
  - `/payments/paypal/capture` — sem validação de `orderId`
  - `/payments/checkout/ppv` — sem validação de `postId`
  - `/admin/users/:id` — sem validação de payload admin
  - `/admin/kyc/:id/review` — sem validação de `rejectedReason`
  - `/kyc/submit` — sem validação de document keys
  - `/withdrawals/request` — validação mínima
  - `/platform/cookie-consent` — sem validação
  - `/platform/contact` — sem validação
  - `/platform/otp/request` — validação fraca
  - `/platform/otp/verify` — validação fraca
- **Impacto:** Type coercion, bypass de lógica, injeção de campos arbitrários.
- **Correção:** Criar schemas Zod para todos os endpoints e usar `validateBody()`.

---

## VULNERABILIDADES ALTAS (CVSS 7.0-8.9)

### A01 — Race Condition em Débito/Crédito de FanCoins
- **CVSS:** 7.8
- **Arquivo:** `apps/api/src/services/fancoin.service.ts` (linhas 218-258)
- **Descrição:** Débito e crédito são operações SQL atômicas individualmente, mas **não estão em uma transaction**. Se o crédito falhar após débito bem-sucedido, FanCoins desaparecem.
- **Correção:** Wrapping em `db.transaction()`.

---

### A02 — Race Condition em Webhooks (Double-Credit)
- **CVSS:** 7.8
- **Arquivo:** `apps/api/src/services/payment.service.ts` (linhas 849-851)
- **Descrição:** Check de `payment.status === 'completed'` não é atômico. Dois webhooks simultâneos podem ambos ler `pending`, ambos processar, e creditar FanCoins em dobro.
- **Correção:** `UPDATE ... SET status='completed' WHERE status='pending' RETURNING *` (atomic check-and-set).

---

### A03 — Endpoint de Debug Público
- **CVSS:** 7.5
- **Arquivo:** `apps/api/src/routes/posts.ts` (linha 33)
- **Descrição:**
```typescript
postsRoute.get('/creator/:creatorId/debug', async (c) => { ... })
```
Endpoint de debugging acessível sem autenticação. Expõe dados internos de qualquer criador.
- **Correção:** Remover ou proteger com `authMiddleware` + `adminMiddleware`.

---

### A04 — SQL Wildcard Injection
- **CVSS:** 7.5
- **Arquivos:** `apps/api/src/routes/admin.ts` (linha 44), `apps/api/src/routes/fancoins.ts` (linha 120)
- **Descrição:** Caracteres `%` e `_` do input do usuário não são escapados em operações `like()`:
```typescript
like(users.username, `%${search}%`)
```
- **Impacto:** Enumeração de usernames/emails via timing attacks, bypass de filtros.
- **Correção:**
```typescript
const escapeLike = (str: string) => str.replace(/[%_\\]/g, '\\$&')
like(users.username, `%${escapeLike(search)}%`)
```

---

### A05 — Sem Verificação de Valor do Pagamento no Webhook
- **CVSS:** 7.5
- **Arquivo:** `apps/api/src/services/payment.service.ts` (linhas 637-655)
- **Descrição:** Ao processar webhook do MercadoPago, o `transaction_amount` retornado não é validado contra o valor original do pagamento.
- **Impacto:** Pagamento parcial pode ser aceito como completo.
- **Correção:** Validar `mpPayment.transaction_amount === payment.amount`.

---

### A06 — Enumeração de Contas no Registro
- **CVSS:** 7.3
- **Arquivo:** `apps/api/src/services/auth.service.ts` (linhas 23-41)
- **Descrição:** Retorna erros distintos para email existente (`EMAIL_EXISTS`) vs username existente (`USERNAME_EXISTS`).
- **Impacto:** Atacante pode enumerar emails/usernames válidos.
- **Correção:** Retornar erro genérico: `USER_EXISTS`.

---

### A07 — Enumeração de Contas no Login (Timing Attack)
- **CVSS:** 7.3
- **Arquivo:** `apps/api/src/services/auth.service.ts` (linhas 131-176)
- **Descrição:** Se o usuário não existe, nenhum hash bcrypt é computado, tornando a resposta mais rápida. Atacante pode distinguir emails válidos por timing.
- **Correção:** Sempre computar hash dummy quando usuário não existe:
```typescript
const dummyHash = '$2b$12$LJ3m4ys3Lg...'
const valid = await verifyPassword(input.password, user?.passwordHash || dummyHash)
if (!user || !valid) { ... }
```

---

### A08 — Sem Rate Limit em /auth/refresh
- **CVSS:** 7.2
- **Arquivo:** `apps/api/src/routes/auth.ts` (linhas 38-50)
- **Descrição:** Endpoint de refresh de token não tem nenhum rate limiting.
- **Impacto:** Brute force de refresh tokens.
- **Correção:** Adicionar `sensitiveRateLimit`.

---

### A09 — Sem Revogação de Token ao Mudar Senha
- **CVSS:** 7.2
- **Arquivo:** `apps/api/src/services/user.service.ts` (linhas 196-211)
- **Descrição:** Ao mudar a senha, tokens existentes (access e refresh) continuam válidos.
- **Impacto:** Sessão comprometida permanece ativa mesmo após troca de senha.
- **Correção:** Blacklist de todos os tokens do usuário ao mudar senha.

---

### A10 — Validação de Amount em Pagamento Custom
- **CVSS:** 7.1
- **Arquivo:** `apps/api/src/routes/payments.ts` (linhas 42-62)
- **Descrição:** `Number(amountBrl)` aceita strings que resultam em `Infinity` ou valores astronomicamente altos. Sem limite máximo.
- **Correção:** Validar range: `amountBrl >= 5 && amountBrl <= 10000`.

---

### A11 — Paginação Sem Limites Superiores
- **CVSS:** 7.0
- **Arquivos:** Múltiplos routes (`admin.ts`, `discovery.ts`, `feed.ts`, `messages.ts`, etc.)
- **Descrição:** `Number(c.req.query('limit'))` sem `Math.min()` permite `?limit=999999999`.
- **Impacto:** DoS via queries de banco pesadas.
- **Correção:** `Math.min(100, Math.max(1, Number(limit) || 20))` em todos os endpoints.

---

### A12 — Requisitos de Senha Fracos
- **CVSS:** 7.0
- **Arquivo:** `packages/shared/validators/auth.ts` (linhas 10-14)
- **Descrição:** Mínimo 8 caracteres, 1 maiúscula, 1 número. Sem caractere especial, sem lowercase obrigatório.
- **Correção:** Aumentar para 12 caracteres, exigir caractere especial.

---

### A13 — Race Condition em PPV Unlock
- **CVSS:** 7.0
- **Arquivo:** `apps/api/src/services/fancoin.service.ts` (linhas 587-649)
- **Descrição:** Check-then-insert não atômico. Duas requisições simultâneas podem passar o check `ALREADY_UNLOCKED` e debitar FanCoins duas vezes.
- **Correção:** Unique constraint em `(userId, type, metadata->>'postId')` + `ON CONFLICT DO NOTHING`.

---

### A14 — Sem Rate Limit em Endpoints Financeiros
- **CVSS:** 7.0
- **Arquivo:** `apps/api/src/routes/payments.ts` (linhas 19, 42, 77, 92)
- **Descrição:** Endpoints de criação de pagamento não têm rate limiting.
- **Correção:** Adicionar `financialRateLimit` em todos os endpoints de pagamento.

---

### A15 — Sem Endpoint de Logout (Server-Side)
- **CVSS:** 7.0
- **Arquivo:** `apps/web/src/lib/store.ts` (linhas 47-54)
- **Descrição:** Logout apenas remove tokens do localStorage. Não existe endpoint `/auth/logout` para invalidar tokens server-side.
- **Correção:** Criar endpoint de logout que blackliste os tokens.

---

## VULNERABILIDADES MÉDIAS (CVSS 4.0-6.9)

### M01 — Path Traversal em Page Keys
- **CVSS:** 6.8
- **Arquivo:** `apps/api/src/routes/platform.ts` (linhas 33-36)
- **Descrição:** `getPageContent(key)` não valida contra whitelist. Pode acessar settings arbitrários.
- **Correção:** Whitelist de keys permitidas.

### M02 — Email Header Injection
- **CVSS:** 6.5
- **Arquivo:** `apps/api/src/services/platform.service.ts` (linha 76)
- **Descrição:** Regex de email não previne `\n`/`\r` (CRLF injection).
- **Correção:** Adicionar check `if (/[\r\n]/.test(data.email))`.

### M03 — Ecosystem Fund Não-Transacional
- **CVSS:** 6.5
- **Arquivo:** `apps/api/src/services/fancoin.service.ts` (linhas 18-46)
- **Descrição:** Se o crédito ao fundo falha, o montante é subtraído do creator mas nunca creditado.
- **Correção:** Wrapping em transaction.

### M04 — Precisão de Ponto Flutuante em Taxas
- **CVSS:** 6.3
- **Arquivo:** `apps/api/src/services/fancoin.service.ts` (linhas 237-247)
- **Descrição:** `feeRate / tierMultiplier` produz floats imprecisos. Erros acumulam.
- **Correção:** Usar inteiros (centavos) ou biblioteca de precisão decimal.

### M05 — Default de Steganografia Hardcoded
- **CVSS:** 6.2
- **Arquivo:** `apps/api/src/routes/upload.ts` (linha 176)
- **Descrição:** `env.STEGO_SECRET || env.JWT_SECRET || 'fandreams-stego-default'`
- **Correção:** Remover fallback hardcoded.

### M06 — JWT Inline sem Middleware
- **CVSS:** 6.0
- **Arquivos:** `apps/api/src/routes/posts.ts` (linhas 46-54, 67-76, 210)
- **Descrição:** Verificação JWT inline com `catch {}` vazio em endpoints públicos.
- **Correção:** Criar `optionalAuthMiddleware`.

### M07 — Sem Type no Access Token
- **CVSS:** 6.0
- **Arquivo:** `apps/api/src/utils/tokens.ts` (linhas 5-10)
- **Descrição:** Access token não tem campo `type: 'access'`. Refresh token ou email token poderiam ser aceitos.
- **Correção:** Adicionar `type: 'access'` e validar no middleware.

### M08 — Sem Audience (aud) no JWT
- **CVSS:** 5.8
- **Arquivo:** `apps/api/src/utils/tokens.ts`
- **Descrição:** JWTs não possuem claim `aud`. Se segredo vazar, tokens podem ser reutilizados em outros sistemas.
- **Correção:** Adicionar `aud: 'fandreams-api'`.

### M09 — Token de Password Reset Reutilizável
- **CVSS:** 5.8
- **Arquivo:** `apps/api/src/services/auth.service.ts` (linhas 398-418)
- **Descrição:** Após uso, token de reset não é blacklisted. Pode ser usado múltiplas vezes.
- **Correção:** One-time-use com blacklist.

### M10 — 2FA OTP em Memória
- **CVSS:** 5.5
- **Arquivo:** `apps/api/src/services/twofa.service.ts` (linhas 13-25)
- **Descrição:** OTPs armazenados em `Map<>` em memória. Perdidos em restart.
- **Correção:** Migrar para Redis.

### M11 — Validação de Preço de Tier Ausente
- **CVSS:** 5.5
- **Arquivo:** `apps/api/src/services/subscription.service.ts` (linhas 54-59)
- **Descrição:** Preço do tier não validado (pode ser negativo ou zero).
- **Correção:** `if (tier.price <= 0) throw Error`.

### M12 — Fraud de Afiliados
- **CVSS:** 5.3
- **Arquivo:** `apps/api/src/routes/subscriptions.ts` (linhas 17-61)
- **Descrição:** `refCode` do usuário não validado antes de registrar referral.
- **Correção:** Validar existência e ownership do código.

### M13 — CPF Placeholder no OpenPix
- **CVSS:** 5.3
- **Arquivo:** `apps/api/src/services/subscription.service.ts` (linhas 264-272)
- **Descrição:** `taxID: '00000000000'` placeholder para todos os usuários.
- **Correção:** Coletar CPF real via KYC.

### M14 — Logging Financeiro Insuficiente
- **CVSS:** 5.0
- **Arquivos:** Múltiplos services de pagamento
- **Descrição:** Operações críticas usam apenas `console.log/error`. Não são persistidos ou indexados.
- **Correção:** Structured logging com Pino/Winston.

### M15 — Email Verify Secret Opcional
- **CVSS:** 5.0
- **Arquivo:** `apps/api/src/config/env.ts` (linha 10)
- **Descrição:** Falls back para derivação do JWT_SECRET. Não criptograficamente independente.
- **Correção:** Tornar obrigatório em produção.

### M16 — Sem CSP Headers
- **CVSS:** 4.5
- **Arquivo:** `apps/web/next.config.ts`
- **Descrição:** Content Security Policy não configurado. XSS não mitigado por CSP do browser.
- **Correção:** Configurar CSP via Next.js middleware.

---

## VULNERABILIDADES BAIXAS (CVSS 1.0-3.9)

| ID | Descrição | CVSS | Arquivo |
|----|-----------|------|---------|
| B01 | Console errors silenciosos em operações críticas | 3.8 | post.service.ts, user.service.ts |
| B02 | Sem rate limit em endpoints públicos (search, feed) | 3.5 | discovery.ts, affiliates.ts |
| B03 | Integer overflow em query params (NaN, Infinity) | 3.5 | pitch.ts, discovery.ts, posts.ts |
| B04 | Account lockout em memória (não persistente) | 3.3 | rateLimit.ts linhas 224-278 |
| B05 | Sem tracking de dispositivos/sessões | 3.0 | Auth system |
| B06 | Sem backoff progressivo em OTP | 3.0 | twofa.service.ts linhas 57-79 |
| B07 | Email verification não bloqueia acesso | 2.8 | auth.service.ts linhas 109-128 |
| B08 | Sem histórico de senhas | 2.5 | user.service.ts |
| B09 | Sem warning de timeout de sessão | 2.0 | Frontend |
| B10 | Env vars opcionais em produção (Redis) | 2.0 | env.ts linhas 54-73 |
| B11 | TOCTOU em file ownership check | 1.5 | upload.ts linhas 304-323 |

---

## PONTOS POSITIVOS (BOAS PRÁTICAS IDENTIFICADAS)

| Prática | Status | Localização |
|---------|--------|-------------|
| bcryptjs com 12 salt rounds | ✅ Seguro | password.ts |
| Lockout progressivo (5/10/20 tentativas) | ✅ Seguro | rateLimit.ts |
| Password reset com tipo e expiração | ✅ Seguro | auth.service.ts |
| Secrets separados por tipo de token | ✅ Seguro | tokens.ts |
| JWT_SECRET mínimo 32 caracteres | ✅ Seguro | env.ts |
| Drizzle ORM com queries parametrizadas | ✅ Seguro | Todos os services |
| Audit logging em rotas admin | ✅ Seguro | index.ts |
| CORS com whitelist de origens | ✅ Seguro | index.ts |
| Limite de tamanho em uploads | ✅ Seguro | upload.ts |
| EXIF stripping em imagens | ✅ Seguro | upload.ts |
| Watermarking/steganografia para proteção de conteúdo | ✅ Seguro | upload.ts |
| NOWPayments usa timingSafeEqual | ✅ Seguro | payments.ts |
| Docker com node:22-slim | ✅ Seguro | Dockerfile |
| Sem eval() ou execução dinâmica | ✅ Seguro | Todo o codebase |

---

## PLANO DE REMEDIAÇÃO PRIORIZADO

### SEMANA 1 — CRÍTICO (Parar tudo e corrigir)

| # | Ação | Arquivos | Esforço |
|---|------|----------|---------|
| 1 | Implementar verificação obrigatória de webhook (MP, OpenPix, PayPal) | payments.ts, openpix.service.ts | 4h |
| 2 | Remover CPF hardcoded, coletar via KYC | payment.service.ts, subscription.service.ts | 3h |
| 3 | Remover senha admin padrão | create-admin.ts | 30min |
| 4 | Wrapping de transações financeiras em db.transaction() | payment.service.ts, fancoin.service.ts | 6h |
| 5 | Adicionar Zod schemas nos 15+ endpoints sem validação | Múltiplos routes | 6h |
| 6 | Remover endpoint de debug público | posts.ts | 15min |

### SEMANA 2 — ALTO (Correção urgente)

| # | Ação | Arquivos | Esforço |
|---|------|----------|---------|
| 7 | Migrar token blacklist para Redis | tokens.ts | 3h |
| 8 | Migrar tokens de localStorage para httpOnly cookies | api.ts, store.ts, auth middleware | 8h |
| 9 | Implementar CSRF protection | index.ts, middleware | 4h |
| 10 | Fix race conditions (webhook idempotency, PPV unlock) | payment.service.ts, fancoin.service.ts | 5h |
| 11 | Adicionar rate limiting em endpoints financeiros e auth/refresh | payments.ts, auth.ts | 2h |
| 12 | Fix account enumeration (registro + login timing) | auth.service.ts | 2h |
| 13 | Revogar tokens ao mudar senha | user.service.ts | 2h |
| 14 | Criar endpoint de logout server-side | auth.ts | 2h |
| 15 | Validar amount do webhook contra pagamento original | payment.service.ts | 2h |

### SEMANA 3 — MÉDIO (Hardening)

| # | Ação | Arquivos | Esforço |
|---|------|----------|---------|
| 16 | Adicionar type/aud claims nos JWTs | tokens.ts, auth middleware | 2h |
| 17 | Escapar wildcards em buscas SQL | admin.ts, fancoins.ts, discovery.ts | 1h |
| 18 | Whitelist de page keys | platform.ts | 1h |
| 19 | Fix email CRLF injection | platform.service.ts | 30min |
| 20 | Remover secret de steganografia hardcoded | upload.ts, media.ts | 30min |
| 21 | Criar optionalAuthMiddleware | middleware/auth.ts, posts.ts | 2h |
| 22 | Migrar 2FA OTP para Redis | twofa.service.ts | 2h |
| 23 | Configurar CSP headers | next.config.ts ou middleware.ts | 2h |
| 24 | Structured logging | Múltiplos services | 4h |
| 25 | Validar bounds de paginação globalmente | Criar middleware | 2h |

### SEMANA 4 — BAIXO (Melhoria contínua)

| # | Ação | Esforço |
|---|------|---------|
| 26 | Fortalecer requisitos de senha (12 chars + especial) | 1h |
| 27 | Implementar tracking de dispositivos/sessões | 4h |
| 28 | Email verification gatear features sensíveis | 3h |
| 29 | Histórico de senhas | 2h |
| 30 | Migrar account lockout para Redis | 2h |

---

## MAPA DE RISCO POR ÁREA

```
                    IMPACTO
                    ALTO ┃ C01 C02 C03  C09  A01 A02
                         ┃ C04 C06      A05
                         ┃ C05 C07 C08
                         ┃ C10
                   MÉDIO ┃ A03 A04 A06  M01 M02 M03
                         ┃ A07 A08 A09  M04 M05 M06
                         ┃ A10 A11 A12
                   BAIXO ┃ B01-B11      M14 M15 M16
                         ┗━━━━━━━━━━━━━━━━━━━━━━━━━━
                          BAIXA  MÉDIA   ALTA
                            PROBABILIDADE
```

---

## CONCLUSÃO

A plataforma FanDreams tem **fundamentos de segurança sólidos** (ORM parametrizado, bcrypt robusto, rate limiting parcial), mas possui **vulnerabilidades críticas em 3 áreas**:

1. **Webhooks de Pagamento** (C01-C03): Permitem fraude financeira completa. **Correção imediata obrigatória.**
2. **Gestão de Sessões** (C06-C08): localStorage + sem CSRF + blacklist em memória = roubo de sessão possível.
3. **Atomicidade Financeira** (C09, A01-A02): Race conditions permitem double-spend e perda de fundos.

**Recomendação:** Pausar novas features até que os itens da Semana 1 e 2 sejam corrigidos. A plataforma **não deve processar transações financeiras reais** até que as vulnerabilidades C01-C03, C09 e A01-A02 sejam resolvidas.

---

*Relatório gerado via análise estática de código (SAST). Recomenda-se complementar com testes dinâmicos (DAST/pentest) após as correções.*

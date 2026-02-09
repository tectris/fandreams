# Estudo: Internacionalização, Plataformas de Pagamento e Diagnóstico de E-mails

**Data:** Fevereiro 2026
**Escopo:** Expansão do FanDreams para mercados em espanhol e inglês

---

## Sumário Executivo

Este documento cobre três frentes:

1. **Internacionalização (i18n)** - Esforço para suportar pt-BR, es e en
2. **Plataformas de Pagamento** - Opções que atendem BR + LatAm + US/EU
3. **Diagnóstico de E-mails** - Por que os e-mails não estão sendo enviados

---

## 1. INTERNACIONALIZAÇÃO (i18n)

### 1.1 Estado Atual

- Todo o texto da aplicação está **hardcoded em português (pt-BR)**
- HTML lang: `pt-BR` fixo em `apps/web/src/app/layout.tsx`
- Nenhum framework de i18n instalado
- Nenhum arquivo de tradução existente
- Campo `language` na tabela `users` já existe com default `'pt-BR'` (bom sinal)
- Moeda hardcoded como `BRL` em todo o sistema de pagamentos

### 1.2 Inventário de Strings Traduzíveis

| Área | Strings Estimadas | Complexidade | Prioridade |
|---|---|---|---|
| Autenticação (login, registro, reset) | 35-40 | Baixa | Crítica |
| Header/Navegação/Sidebar | 15-20 | Baixa | Crítica |
| Feed & Posts (post-card, feed) | 60-70 | Média | Crítica |
| Assinaturas (subscribe-drawer) | 40-50 | Média | Alta |
| Carteira & FanCoins (wallet, drawers) | 45-55 | Média | Alta |
| Templates de E-mail (email.service) | 40-50 | Média | Alta |
| Configurações/Perfil (settings) | 25-30 | Baixa | Alta |
| Validação/Erros (validators, services) | 25-30 | Baixa | Alta |
| Dashboard do Criador | 20-25 | Baixa | Média |
| Verificação KYC | 30-35 | Baixa | Média |
| Admin Panel | 20-25 | Baixa | Média |
| Landing Page | 20-25 | Baixa | Média |
| **TOTAL** | **~375-425** | | |

### 1.3 Abordagem Técnica Recomendada

#### Framework: `next-intl`

Recomendação: **next-intl** (melhor integração com Next.js App Router).

Alternativa: `react-i18next` (mais genérico, maior comunidade).

#### Estrutura de Arquivos

```
apps/web/
├── messages/
│   ├── pt-BR.json      # Português (fonte primária)
│   ├── es.json          # Espanhol
│   └── en.json          # Inglês
├── src/
│   ├── i18n/
│   │   ├── config.ts    # Configuração de locales
│   │   └── request.ts   # Middleware de detecção
│   └── app/
│       └── [locale]/    # Rotas com prefixo de idioma
│           ├── (platform)/
│           ├── login/
│           └── ...
```

#### Mudanças Necessárias no Frontend (apps/web)

1. **Instalar next-intl** (`pnpm add next-intl`)
2. **Criar arquivos de tradução** (3 JSONs: pt-BR, es, en)
3. **Configurar middleware** de detecção de idioma (URL prefix: `/es/`, `/en/`)
4. **Reestruturar App Router** para `[locale]/` como segmento dinâmico
5. **Substituir todas as strings** hardcoded por chamadas `t('chave')`
6. **Atualizar metadata** (SEO) para cada idioma
7. **Adicionar seletor de idioma** no header

#### Mudanças Necessárias no Backend (apps/api)

1. **E-mail templates**: Criar versões traduzidas (parametrizar pelo campo `language` do user)
2. **Mensagens de erro da API**: Retornar códigos de erro (não mensagens) e traduzir no frontend
3. **Validadores**: Mover mensagens de erro para o frontend (usar códigos)

#### Mudanças no Banco de Dados

- O campo `language` já existe na tabela `users` - só precisa ser utilizado
- Adicionar enum para idiomas suportados: `pt-BR`, `es`, `en`

### 1.4 Estimativa de Esforço

| Tarefa | Esforço |
|---|---|
| Setup do next-intl + middleware + routing | Pequeno |
| Extrair ~400 strings para JSON (pt-BR) | Médio |
| Traduzir para espanhol (~400 strings) | Médio |
| Traduzir para inglês (~400 strings) | Médio |
| Refatorar todos os componentes para usar `t()` | Grande |
| Internacionalizar templates de e-mail | Médio |
| Internacionalizar mensagens de erro da API | Médio |
| Seletor de idioma + persistência | Pequeno |
| Testes e QA em 3 idiomas | Médio |
| Ajustes de layout (textos maiores/menores) | Pequeno |

**Estimativa total**: Esforço significativo. A maior parte do trabalho está na refatoração dos componentes (~30+ arquivos) para usar chamadas `t()` em vez de strings hardcoded.

### 1.5 Sugestão de Fases

**Fase 1 - Infraestrutura** (fazer primeiro)
- Instalar next-intl, configurar routing, middleware
- Extrair strings do pt-BR para JSON
- Refatorar componentes críticos (auth, nav, feed)

**Fase 2 - Tradução** (em paralelo)
- Traduzir JSONs para es e en
- Internacionalizar e-mail templates
- Adicionar seletor de idioma

**Fase 3 - Polimento**
- Componentes restantes (admin, KYC, dashboard)
- Testes multi-idioma
- SEO multi-idioma (hreflang, sitemap)

---

## 2. PLATAFORMAS DE PAGAMENTO

### 2.1 Estado Atual

| Provedor | Status | Uso |
|---|---|---|
| **MercadoPago** | Integrado | PIX, cartão, assinaturas (Preapproval) |
| **NOWPayments** | Integrado | Crypto (BTC, USDT, ETH) |
| **PayPal** | Integrado | Pagamentos internacionais |

Moeda: BRL hardcoded. Sem suporte multi-moeda.

### 2.2 Análise Comparativa de Plataformas

#### Stripe (Recomendação Principal)

| Item | Detalhe |
|---|---|
| **Mercados** | 46+ países (conta), 195+ (aceitar pagamentos), 135+ moedas |
| **Brasil** | PIX (via EBANX), Boleto, cartões |
| **México** | OXXO, SPEI, cartões |
| **US/Europa** | Cobertura completa: cards, ACH, SEPA, Apple/Google Pay |
| **Taxas (US)** | 2.9% + $0.30 |
| **Taxas (BR)** | ~3.99% + R$0.50 (cartão); PIX com taxa menor |
| **Assinaturas** | Stripe Billing - melhor do mercado (dunning, retries, portal) |
| **Marketplace** | **Stripe Connect** - split payments, contas de criadores, KYC automático |
| **API** | Referência do mercado. SDKs para todas as linguagens |
| **Limitação** | LatAm fora de BR/MX tem suporte limitado para contas de criadores |

#### MercadoPago (Atual - Manter para Brasil)

| Item | Detalhe |
|---|---|
| **Mercados** | 7 países LatAm (BR, MX, AR, CO, CL, PE, UY) |
| **Brasil** | PIX (~0.99%), Boleto, cartões, wallet MP |
| **Taxas** | 3-5% cartão, ~0.99% PIX |
| **Assinaturas** | Preapproval API (básica, sem dunning sofisticado) |
| **Marketplace** | Split Payments API disponível |
| **Limitação** | Cada país precisa de conta separada. Sem US/Europa |

#### PayPal (Atual - Manter como Alternativa)

| Item | Detalhe |
|---|---|
| **Mercados** | 200+ países, 24 moedas |
| **Métodos** | Wallet PayPal, cartões, Pay Later |
| **Taxas (US)** | 2.99% + $0.49 doméstico; +1.5% internacional |
| **Limitação** | Sem métodos locais LatAm (sem PIX, sem OXXO). Caro para cross-border |

#### dLocal (Especialista LatAm - Futuro)

| Item | Detalhe |
|---|---|
| **Mercados** | 40+ países emergentes (toda LatAm) |
| **Métodos** | Todos os métodos locais de cada país (PIX, OXXO, PSE, Rapipago, etc.) |
| **Diferencial** | **API única para toda a LatAm** (resolve o problema do MP) |
| **Marketplace** | "dLocal for Platforms" - split payments, KYC, onboarding de sellers |
| **Taxas** | Customizadas/enterprise (não públicas) |
| **Quando usar** | Quando o volume em LatAm hispânica justificar |

#### EBANX (Referência)

| Item | Detalhe |
|---|---|
| **Mercados** | 14+ países LatAm |
| **Diferencial** | Foco em creator economy. Já é o parceiro por trás do PIX do Stripe |
| **Taxas** | ~5% + $200/mês mínimo |
| **Limitação** | Custo mínimo mensal alto para plataformas em crescimento |

#### Paddle e Hotmart/Kiwify

- **Paddle**: Modelo Merchant of Record incompatível com marketplace de criadores. Taxa de 5%+$0.50
- **Hotmart**: Concorrente, não provedor. Taxa de 9.9% (valida que 8% do FanDreams é competitivo)
- **Kiwify**: Brasil only, 8.99% + R$2.49. Sem API robusta

### 2.3 ALERTA CRÍTICO: Políticas de Conteúdo Adulto

Se o FanDreams inclui ou incluirá conteúdo adulto/NSFW, isso **muda completamente** a estratégia de pagamentos.

#### Stripe - PROÍBE conteúdo adulto

Stripe **proíbe explicitamente**:
- "Adult services" (escorts, pay-per-view sexual, fetish services, adult live-chat)
- "Pornography and other mature audience content" para fins de gratificação sexual
- Conteúdo AI-generated adulto (adicionado em Jan/2024)

Em 2024-2025, Stripe **endureceu** a fiscalização:
- Cortou a WishTender (plataforma de wishlists de sex workers) com poucos dias de aviso
- Pressionou o itch.io para desindexar conteúdo NSFW (junto com PayPal)

**Exceção OnlyFans**: OnlyFans usa Stripe, mas processa **+$500M/mês** e negociou exceção única. Não se aplica a plataformas menores.

#### MercadoPago - PROÍBE conteúdo adulto

Proíbe explicitamente: pornografia, serviços de acompanhante, webcam adulta, dating services, agências de modelagem adulta. Violação = suspensão permanente sem aviso.

#### PayPal - PROÍBE conteúdo adulto digital

Permite apenas bens físicos adultos (US). Proíbe bens digitais adultos, serviços sexuais. Contas são congeladas sem aviso.

#### Visa/Mastercard - Exigências Regulatórias (aplicam a TODOS os processadores)

Independente do processador usado, as bandeiras de cartão exigem:
- Verificação de idade de todos os criadores e pessoas retratadas
- Documentação de consentimento escrito de todos os participantes
- Revisão de conteúdo antes da publicação
- Canais de reclamação/takedown
- Monitoramento contínuo de compliance
- Multas de **$25.000 por merchant** para violações (Visa VIRP)

### 2.4 Processadores Especializados em Conteúdo Adulto

Se o FanDreams terá conteúdo NSFW, estes são os processadores viáveis:

#### CCBill (Líder do mercado adulto)

| Item | Detalhe |
|---|---|
| **Usado por** | Fansly, OnlyFans (parcial) |
| **Taxas** | 10.8-14.5% para conteúdo adulto; 3.9%+$0.55 para SFW |
| **Rolling reserve** | ~30% |
| **Registro MID** | ~$500 primeiro ano, ~$100 renovação anual |
| **Assinaturas** | Sim, com billing automation |
| **Compliance** | Lida com verificação de idade e compliance Visa/MC |

#### Segpay

| Item | Detalhe |
|---|---|
| **Taxas** | 4-15% para high-risk |
| **Onboarding** | 24-72 horas (mais rápido do mercado) |
| **Ideal para** | Streaming, cam sites, plataformas de criadores |

#### Epoch

| Item | Detalhe |
|---|---|
| **Diferencial** | IPSP - não precisa de merchant account separado |
| **Ideal para** | Assinaturas, memberships, VOD |
| **Experiência** | 20+ anos de especialização |

#### Quem usa o quê (referência do mercado)

| Plataforma | Processador Fan-Side | Payouts Criadores |
|---|---|---|
| **OnlyFans** | Stripe, CCBill, Merrick, Harris | ACH, Wire, PayPal |
| **Fansly** | CCBill (primário) | ACH/SEPA, Skrill, Paxum |
| **Fanvue** | Shift Holdings (in-house) | Bank, MassPay, Crypto |
| **LoyalFans** | EU-based ("LoyalBills.com") | ACH, SEPA, Paxum, Crypto |
| **Patreon** | Múltiplos (Visa/MC compliance) | Bank, PayPal, Payoneer |

### 2.5 Recomendação Revisada: Arquitetura com Conteúdo Adulto

#### Cenário A: FanDreams SEM conteúdo adulto

Se a plataforma for exclusivamente SFW:

```
┌─────────────────────────────────────────────────────┐
│         ARQUITETURA DE PAGAMENTOS (SFW)             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  PRIMÁRIO: Stripe Connect                           │
│  ├── US/Europa: Cards, ACH, SEPA, Apple/Google Pay  │
│  ├── Brasil: PIX, Boleto, Cards                     │
│  ├── México: OXXO, SPEI, Cards                      │
│  └── Assinaturas: Stripe Billing                    │
│                                                     │
│  BRASIL (backup): MercadoPago                       │
│  ├── PIX com menor taxa (~0.99%)                    │
│  └── Wallet MercadoPago                             │
│                                                     │
│  INTERNACIONAL: PayPal                              │
│  └── Opção alternativa p/ US/EU (trust signal)      │
│                                                     │
│  CRYPTO: NOWPayments                                │
│  └── BTC, USDT, ETH                                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

#### Cenário B: FanDreams COM conteúdo adulto (recomendado se aplicável)

```
┌─────────────────────────────────────────────────────┐
│         ARQUITETURA DE PAGAMENTOS (NSFW)            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  CONTEÚDO NSFW: CCBill ou Segpay (primário)         │
│  ├── Assinaturas de criadores adultos               │
│  ├── PPV de conteúdo adulto                         │
│  ├── Tips para criadores adultos                    │
│  └── Taxas: 10.8-14.5% (custo do segmento)         │
│                                                     │
│  CONTEÚDO SFW: MercadoPago (Brasil)                 │
│  ├── PIX (~0.99%)                                   │
│  ├── Cartões                                        │
│  └── Assinaturas SFW (Preapproval)                  │
│                                                     │
│  CONTEÚDO SFW INTERNACIONAL: PayPal / Stripe        │
│  ├── Cards, Apple/Google Pay (Stripe)               │
│  └── PayPal wallet (trust signal)                   │
│                                                     │
│  CRYPTO (qualquer conteúdo): NOWPayments            │
│  └── BTC, USDT, ETH (censorship-resistant)          │
│                                                     │
│  REDUNDÂNCIA: 2+ processadores adultos              │
│  └── Se um cair, redireciona automaticamente        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Pontos importantes do Cenário B:**

1. **Separação obrigatória**: O sistema precisa classificar conteúdo como SFW/NSFW e rotear para o processador correto
2. **Taxas mais altas**: Budget de 10-15% no processador (vs. 2.9% do Stripe). Isso impacta a margem - considerar ajustar a taxa da plataforma para NSFW
3. **Compliance Visa/MC**: Obrigatório independente do processador - KYC, verificação de idade, consent forms, content review, takedown process
4. **Orquestração de pagamentos**: Prática padrão no segmento adulto - ter 2+ processadores para redundância caso um bloqueie a conta
5. **Chargebacks**: Segmento adulto tem 5-7x mais chargebacks. Reservar rolling reserve (~30% em CCBill)
6. **Crypto como hedge**: NOWPayments (já integrado) serve como opção censorship-resistant

### 2.6 Comparação de Custos (Assinatura de R$50)

| Provedor | Taxa | Criador recebe (após 8% plataforma) |
|---|---|---|
| MercadoPago PIX | ~R$0.50 (0.99%) | R$45.50 |
| Stripe PIX (via EBANX) | ~R$0.75-1.00 (1-2%) | R$44.50-45.00 |
| MercadoPago Cartão | ~R$2.00-2.50 (4-5%) | R$43.50-44.00 |
| Stripe Cartão (BR) | ~R$2.50 (3.99%+R$0.50) | R$43.50 |
| PayPal | ~R$2.25 + markup FX | R$43.26 |
| **CCBill (NSFW)** | **~R$5.40-7.25 (10.8-14.5%)** | **R$38.75-40.60** |
| **Segpay (NSFW)** | **~R$2.00-7.50 (4-15%)** | **R$38.50-44.00** |

### 2.7 Plano de Migração

**Se SFW:**

**Fase 1** - Adicionar Stripe Connect (Express accounts, Stripe Billing, multi-moeda)
**Fase 2** - Roteamento Inteligente (BR: MP/Stripe, MX: Stripe, US/EU: Stripe/PayPal)
**Fase 3** - Expansão LatAm (dLocal se volume justificar)

**Se NSFW (ou misto):**

**Fase 1** - Integrar CCBill/Segpay + classificação SFW/NSFW no conteúdo
**Fase 2** - Manter MP + PayPal para SFW, NSFW vai para processador adulto
**Fase 3** - Adicionar Stripe somente para SFW internacional + expansão

### 2.8 Mudanças no Código para Multi-Moeda

Arquivos que precisam de alteração:
- `packages/database/schema/payments.ts` - Campo currency precisa aceitar USD, EUR, MXN etc.
- `packages/shared/constants/pricing.ts` - Preços hardcoded em BRL
- `apps/api/src/services/payment.service.ts` - Lógica de criação de pagamentos
- `apps/api/src/services/subscription.service.ts` - Assinaturas em multi-moeda
- `apps/api/src/services/fancoin.service.ts` - Conversão de FanCoins por moeda
- `apps/web/src/components/subscription/subscribe-drawer.tsx` - UI de checkout
- `apps/web/src/components/fancoins/fancoin-drawer.tsx` - UI de compra de FanCoins

---

## 3. DIAGNÓSTICO: E-MAILS NÃO ENVIADOS

### 3.1 Causa Raiz Confirmada

**Sim, é exatamente isso.** A `RESEND_API_KEY` precisa estar configurada no **Railway**, não no Vercel.

Explicação:

```
┌──────────────┐         ┌──────────────┐         ┌──────────┐
│   Vercel     │         │   Railway    │         │  Resend  │
│   (Frontend) │ ──API──>│   (API/Hono) │ ──HTTP──>│  (Email) │
│   apps/web   │         │   apps/api   │         │          │
└──────────────┘         └──────────────┘         └──────────┘
                               ▲
                               │
                         Aqui é onde o
                         email.service.ts
                         roda e precisa da
                         RESEND_API_KEY
```

O serviço de e-mail (`apps/api/src/services/email.service.ts`) roda no **servidor da API (Railway)**, não no frontend (Vercel). O código funciona assim:

```typescript
// email.service.ts:33-44
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  if (env.RESEND_API_KEY) {         // ← Se não tem a key, pula para o fallback
    return sendViaResend(payload)
  }

  // Dev fallback: apenas loga no console
  console.log('========== EMAIL (dev) ==========')
  // ...
  return true  // ← Retorna true (sucesso) mesmo sem enviar!
}
```

**O que está acontecendo:**
1. A API no Railway **não tem** `RESEND_API_KEY` configurada
2. O `sendEmail()` verifica se a key existe → **não existe**
3. Cai no fallback de desenvolvimento → **loga no console**
4. Retorna `true` → a API acha que o e-mail foi enviado com sucesso
5. O usuário nunca recebe o e-mail

### 3.2 Solução

Adicionar no Railway **todas** estas variáveis de ambiente:

```env
# OBRIGATÓRIO para e-mails funcionarem
RESEND_API_KEY=re_xxxxxxxxxx

# RECOMENDADO (já tem default mas bom explicitar)
EMAIL_FROM=FanDreams <noreply@fandreams.app>

# NECESSÁRIO para links nos e-mails apontarem para o domínio correto
NEXT_PUBLIC_APP_URL=https://fandreams.app
```

**Passos:**
1. Acessar o dashboard do Railway
2. Selecionar o serviço da API
3. Ir em **Variables**
4. Adicionar `RESEND_API_KEY` com o mesmo valor que está no Vercel
5. Adicionar `NEXT_PUBLIC_APP_URL=https://fandreams.app` (para os links dos e-mails)
6. O Railway fará redeploy automaticamente

### 3.3 Verificação Pós-Configuração

Após configurar, verificar no Railway logs:
- **Antes**: Você verá `========== EMAIL (dev) ==========` nos logs
- **Depois**: Não verá mais essas mensagens (e-mails serão enviados via Resend)

Para testar:
1. Registrar um novo usuário → deve receber e-mail de verificação
2. Solicitar reset de senha → deve receber e-mail com link

### 3.4 Nota sobre Domínio do Resend

Certifique-se de que o domínio `fandreams.app` está verificado no painel do Resend:
- Acessar https://resend.com/domains
- O domínio deve ter status **Verified**
- Os registros DNS (SPF, DKIM, DMARC) devem estar configurados
- Sem a verificação do domínio, o Resend rejeitará o envio de `noreply@fandreams.app`

### 3.5 Lista Completa de Variáveis que o Railway Precisa

Para referência, aqui estão **todas** as variáveis que a API necessita (conforme `apps/api/src/config/env.ts`):

| Variável | Obrigatória | Nota |
|---|---|---|
| `DATABASE_URL` | Sim | Neon PostgreSQL |
| `JWT_SECRET` | Sim | Min 32 chars |
| `JWT_REFRESH_SECRET` | Sim | Min 32 chars |
| `RESEND_API_KEY` | **Sim (para e-mails)** | **Faltando no Railway** |
| `EMAIL_FROM` | Não (tem default) | Default: `FanDreams <noreply@fandreams.app>` |
| `NEXT_PUBLIC_APP_URL` | Recomendada | Para links nos e-mails |
| `API_URL` | Recomendada | Para URLs de webhook |
| `CORS_ORIGINS` | Recomendada | Domínios permitidos |
| `UPSTASH_REDIS_REST_URL` | Recomendada | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Recomendada | Rate limiting |
| `MERCADOPAGO_ACCESS_TOKEN` | Para pagamentos | MercadoPago |
| `MERCADOPAGO_WEBHOOK_SECRET` | Recomendada | Validação webhooks |
| `R2_ACCOUNT_ID` | Para uploads | Cloudflare R2 |
| `R2_ACCESS_KEY_ID` | Para uploads | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | Para uploads | Cloudflare R2 |
| `R2_PUBLIC_URL` | Para uploads | URL pública do bucket |
| `BUNNY_API_KEY` | Para vídeos | Bunny Stream |
| `BUNNY_LIBRARY_ID` | Para vídeos | Bunny Stream |
| `BUNNY_CDN_HOSTNAME` | Para vídeos | Bunny CDN |
| `NODE_ENV` | Sim | `production` |

---

## 4. RESUMO DE AÇÕES PRIORITÁRIAS

### Ação Imediata (resolver agora)
- [ ] Adicionar `RESEND_API_KEY` no Railway para e-mails funcionarem
- [ ] Adicionar `NEXT_PUBLIC_APP_URL=https://fandreams.app` no Railway
- [ ] Verificar domínio no Resend (DNS records)

### Curto Prazo (próximas sprints)
- [ ] Configurar next-intl e extrair strings do pt-BR
- [ ] **Definir se a plataforma terá conteúdo adulto/NSFW** (decisão que muda toda a estratégia de pagamentos)
- [ ] Se SFW: Iniciar integração com Stripe Connect
- [ ] Se NSFW: Aplicar para merchant account em CCBill ou Segpay
- [ ] Implementar classificação SFW/NSFW no conteúdo (se misto)

### Médio Prazo
- [ ] Completar tradução para es e en
- [ ] Implementar roteamento inteligente de pagamentos por região
- [ ] Suporte multi-moeda no sistema de FanCoins
- [ ] Se NSFW: Compliance Visa/MC (age verification, consent forms, content review, takedown)

### Longo Prazo
- [ ] Avaliar dLocal para LatAm hispânica (se houver demanda)
- [ ] SEO multi-idioma (hreflang, sitemap por idioma)
- [ ] Adaptar landing page por mercado
- [ ] Orquestração de pagamentos (múltiplos processadores para redundância)

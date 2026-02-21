# FANDREAMS — Documentação Completa do Sistema Financeiro

**Data:** 21 de fevereiro de 2026
**Base:** branch `origin/main` (commit `7ef15db`)

---

## 1. MOEDA INTERNA: FanCoins

| Parâmetro | Valor | Configurável? |
|---|---|---|
| Taxa de conversão | 1 FanCoin = R$ 0,01 | Sim (`fancoin_to_brl`) |
| Moeda de exibição | BRL (Real) | Fixo |

### 1.1 Pacotes de Compra

| ID | Moedas | Preço (BRL) | Bônus | Label |
|---|---|---|---|---|
| `pack_100` | 100 | R$ 1,00 | 0 | 100 FanCoins |
| `pack_500` | 550 | R$ 5,00 | +50 (+10%) | 550 FanCoins |
| `pack_1000` | 1.200 | R$ 10,00 | +200 (+20%) | 1.200 FanCoins |
| `pack_5000` | 6.500 | R$ 50,00 | +1.500 (+30%) | 6.500 FanCoins |
| `pack_10000` | 15.000 | R$ 100,00 | +5.000 (+50%) | 15.000 FanCoins |

### 1.2 Compra Personalizada (Custom Purchase)

| Parâmetro | Valor |
|---|---|
| Mínimo | R$ 1,00 (100 FanCoins) |
| Máximo | R$ 10.000,00 (1.000.000 FanCoins) |
| Taxa | 1 FanCoin = R$ 0,01 (sem bônus) |

### 1.3 Regra de Sacabilidade

- **FanCoins comprados** (pacotes + custom): vão para `bonusBalance` — **NÃO sacáveis**, apenas gastáveis na plataforma
- **FanCoins ganhos** de outros usuários (tips, PPV, assinaturas): vão para `balance` regular — **SACÁVEIS**
- **FanCoins de recompensas/engajamento**: vão para `bonusBalance` — **NÃO sacáveis**
- **Saldo sacável** = `balance - bonusBalance`
- Na hora de gastar, `bonusBalance` é consumido primeiro (`GREATEST(0, bonusBalance - amount)`)

---

## 2. TAXAS DA PLATAFORMA

### 2.1 Taxa Regressiva por Assinantes (Graduated Fee)

Função: `getGraduatedFeeRate(creatorId)` — definida em `withdrawal.service.ts`
Tiers: `GRADUATED_FEE_TIERS` em `packages/shared/constants/pricing.ts`

| Assinantes do Criador | Taxa |
|---|---|
| 0 – 100 | **15%** |
| 101 – 500 | **13%** |
| 501 – 2.000 | **11%** |
| 2.001 – 5.000 | **9%** |
| 5.001+ | **7%** |

- **Desativável** pelo admin: setting `graduated_fees_enabled` (padrão: `true`)
- Se desativado ou criador sem perfil: cai para `getPlatformFeeRate()` (15% base)
- A taxa base (15%) é configurável pelo admin via `platform_fee_percent`

### 2.2 Outras Taxas

| Taxa | Valor | Função | Configurável? |
|---|---|---|---|
| Taxa base plataforma | 15% | `getPlatformFeeRate()` | Sim (`platform_fee_percent`) |
| Taxa P2P (transferência) | 2% | `getP2pFeeRate()` | Sim (`p2p_fee_percent`) |
| Taxa Pitch (crowdfunding) | 5% | `PITCH_CONFIG.platformFeeRate` | Não (constante) |
| Fundo Ecossistema | 1% | `ECOSYSTEM_FUND_RATE` | Não (constante) |

### 2.3 Multiplicador de Tier do Fã (Spending Power)

Fãs de tier mais alto recebem desconto efetivo na taxa da plataforma. A plataforma absorve a diferença.

| Tier | Multiplicador | XP Mínimo | Efeito na taxa (exemplo 15%) |
|---|---|---|---|
| Bronze | 1.00x | 0 | 15,00% (sem desconto) |
| Prata | 1.05x | 1.000 | 14,29% |
| Ouro | 1.10x | 5.000 | 13,64% |
| Diamante | 1.20x | 25.000 | 12,50% |
| Obsidian | 1.30x | 100.000 | 11,54% |

Fórmula: `taxaEfetiva = taxaBase / tierMultiplier`

---

## 3. MAPA COMPLETO DE TRANSAÇÕES

### 3.1 Transações que usam Taxa Regressiva (`getGraduatedFeeRate`)

| Transação | Serviço | Função | Fundo Eco (1%) | Tier Multiplier |
|---|---|---|---|---|
| Tip (gorjeta) | `fancoin.service` | `sendTip()` | Sim | Sim |
| PPV via FanCoins | `fancoin.service` | `unlockPpv()` | Sim | Sim |
| PPV via pagamento externo (MP/OpenPix) | `payment.service` | `createPpvPayment()` | Não* | Não |
| Assinatura mensal (checkout) | `subscription.service` | `createSubscriptionCheckout()` | Não** | Não |
| Assinatura promo (checkout) | `subscription.service` | `createSubscriptionCheckout()` | Não** | Não |
| Assinatura ativação (free/direta) | `subscription.service` | `activateSubscription()` | Não** | Não |
| Webhook MP assinatura | `subscription.service` | `activateSubscriptionFromWebhook()` | Não** | Não |
| Pagamento recorrente MP | `subscription.service` | `recordSubscriptionPayment()` | Não** | Não |
| Renovação PIX (OpenPix) | `subscription.service` | `handleOpenPixSubscriptionRenewal()` | Não** | Não |

\* PPV externo: taxa calculada em BRL no momento do checkout, creditada como FanCoins via `creditEarnings()` que aplica Fundo Eco.
\** Assinaturas: a taxa é aplicada no cálculo BRL, depois o valor líquido do criador passa por `creditEarnings()` que aplica Fundo Eco na conversão para FanCoins.

### 3.2 Transações com Taxa Fixa

| Transação | Serviço | Taxa | Função |
|---|---|---|---|
| Transferência P2P | `fancoin.service` | 2% (`getP2pFeeRate`) | `transferToUser()` |
| Preview transferência | `fancoin.service` | 2% (`getP2pFeeRate`) | `previewTransfer()` |
| Compra de FanCoins (pacote) | `payment.service` | 15% (`getPlatformFeeRate`) | `createFancoinPayment()` |
| Compra de FanCoins (custom) | `payment.service` | 15% (`getPlatformFeeRate`) | `createCustomFancoinPayment()` |
| Pitch (crowdfunding) | `pitch.service` | 5% (constante) | `contributeToPitch()` |

### 3.3 Transações sem Taxa

| Transação | Serviço | Descrição |
|---|---|---|
| Saque (withdrawal) | `withdrawal.service` | 0% — debita FanCoins, paga em BRL |
| Recompensa engajamento | `fancoin.service` | `rewardEngagement()` — credita bônus |
| Bônus de criador | `bonus.service` | Credita `bonusBalance` (não sacável) |
| Bônus grant (vesting) | `bonus-grant.service` | Credita `bonusBalance`, veste por receita/tempo |

---

## 4. FUNDO ECOSSISTEMA

| Parâmetro | Valor |
|---|---|
| Taxa | 1% de cada transação (após taxa da plataforma) |
| Wallet destino | `ECOSYSTEM_FUND_USER_ID` = `00000000-0000-0000-0000-000000000001` |
| Comportamento | Fire-and-forget (nunca bloqueia a transação principal) |

### Aplicação

- **Direta** (via `collectEcosystemFund`): Tips, PPV via FanCoins, Transferências P2P, Pitch
- **Indireta** (via `creditEarnings`): Quando credita ganhos do criador de pagamentos externos (assinaturas MP/OpenPix, PPV externo), o Fundo Eco é aplicado na conversão BRL → FanCoins

---

## 5. SISTEMA DE SAQUES (WITHDRAWALS)

### 5.1 Configuração

| Parâmetro | Valor Padrão | Configurável? |
|---|---|---|
| Saque mínimo | R$ 50,00 | Sim (`min_payout`) |
| Dias de pagamento | 1 e 15 de cada mês | Fixo |
| Máx saques/dia | 3 | Sim (`max_daily_withdrawals`) |
| Máx valor/dia | R$ 10.000,00 | Sim (`max_daily_amount`) |
| Cooldown | 24 horas | Sim (`cooldown_hours`) |
| Aprovação manual acima de | R$ 500,00 | Sim (`manual_approval_threshold`) |

### 5.2 Métodos de Saque

| Método | Mínimo | Tempo de Processamento |
|---|---|---|
| PIX | R$ 10,00 | 24-48 horas |
| Transferência Bancária | R$ 50,00 | 1-3 dias úteis |
| Crypto (USDT) | R$ 20,00 | 10-30 minutos |

### 5.3 Anti-Fraude (8 verificações)

| Check | Peso | Ação |
|---|---|---|
| Limite diário de saques atingido | 100 (bloqueia) | **Bloqueia** |
| Limite diário de valor atingido | 100 (bloqueia) | **Bloqueia** |
| Cooldown ativo (saque recente) | 50 | Score alto → aprovação manual |
| Acima do threshold manual | 30 | Aprovação manual |
| Conta muito nova (<7 dias) | 40 | Score alto |
| Conta nova (<30 dias) | 15 | Score moderado |
| Razão alta saque/total ganho (>90%) | 25 | Score moderado |
| Dreno total do saldo sacável (>95%) | 20 | Score moderado |
| Criador novo com baixos ganhos (<30 dias, earnings < 2x saque) | 35 | Score alto |

- **Score >= 50** ou **acima do threshold**: requer **aprovação manual** do admin
- **DAILY_LIMIT_EXCEEDED** ou **DAILY_AMOUNT_EXCEEDED**: **bloqueio total**

### 5.4 Fluxo do Saque

1. Valida valor positivo e mínimo
2. Verifica saldo total E saldo sacável (`balance - bonusBalance`)
3. Valida detalhes do método (chave PIX, endereço crypto, etc.)
4. Executa anti-fraude
5. **Débito atômico** com guarda dupla: `balance >= amount AND (balance - bonusBalance) >= amount`
6. Registra transação `withdrawal` + cria registro em `payouts`
7. Status: `pending_approval` (se precisa aprovação) ou `pending` (processamento automático)

### 5.5 Rejeição de Saque

- Admin pode rejeitar com motivo
- **Reembolso atômico**: devolve FanCoins ao `balance` e reduz `totalSpent`
- Registra transação `withdrawal_refund`

---

## 6. PROVEDORES DE PAGAMENTO

### 6.1 MercadoPago

| Método | Uso |
|---|---|
| PIX (Transparent Checkout) | QR code in-app |
| Cartão de Crédito (Checkout Pro) | Redirect para MP |
| Preapproval (assinatura recorrente) | Cobrança mensal automática |

### 6.2 OpenPix (Woovi)

| Método | Uso |
|---|---|
| PIX Charge | QR code com brCode para pagamento único |
| Subscription | Cobrança recorrente mensal via PIX |

- **Roteamento automático**: quando OpenPix está configurado (`OPENPIX_APP_ID`), todas as transações PIX são roteadas para OpenPix ao invés do MP
- **Sandbox**: `OPENPIX_SANDBOX=true` usa `api.woovi-sandbox.com`
- **Webhook**: assinatura verificada via HMAC SHA-256 com `OPENPIX_WEBHOOK_SECRET`
- Funções: `createPixCharge`, `createSubscription`, `cancelSubscription`, `verifyWebhookSignature`

### 6.3 NOWPayments (Crypto)

- Moeda: USD
- Método: Crypto

### 6.4 PayPal

- Moeda: BRL
- Método: PayPal checkout

---

## 7. SISTEMA DE ASSINATURAS

### 7.1 Configuração

| Parâmetro | Valor |
|---|---|
| Preço mínimo | R$ 5,00 |
| Preço máximo | R$ 5.000,00 |
| Máx tiers por criador | 5 |
| Moeda | BRL |

### 7.2 Tipos de Assinatura

| Tipo | Duração | Auto-Renew | Provedores |
|---|---|---|---|
| Mensal padrão | 1 mês (recorrente) | Sim | MP Preapproval / OpenPix Subscription |
| Promo 3 meses | 90 dias (único) | Não | MP / OpenPix (pagamento único) |
| Promo 6 meses | 180 dias (único) | Não | MP / OpenPix (pagamento único) |
| Promo 12 meses | 365 dias (único) | Não | MP / OpenPix (pagamento único) |
| Free | Imediata | Sim | N/A (ativação direta) |

### 7.3 Ciclo de Vida

1. **Criação**: Status `pending`, cria cobrança no provedor
2. **Ativação**: Webhook confirma pagamento → status `active`, `currentPeriodEnd` = +1 mês
3. **Renovação**: Webhook de pagamento recorrente → estende `currentPeriodEnd` + 1 mês
4. **Cancelamento**: Fã solicita → `autoRenew = false`, `cancelledAt = now`, **mantém acesso até `currentPeriodEnd`**
5. **Expiração**: Cron job verifica `autoRenew = false AND currentPeriodEnd < now` → status `expired`, decrementa `totalSubscribers`

### 7.4 Cancelamento Gracioso

- Cancela cobrança no provedor (MP ou OpenPix)
- Mantém status `active` até `currentPeriodEnd`
- Envia email de cancelamento com data de fim de acesso

---

## 8. SISTEMA DE AFILIADOS

### 8.1 Configuração

| Parâmetro | Valor |
|---|---|
| Níveis | 1 (apenas indicação direta) |
| Comissão | 1% a 50% (configurável por criador) |
| Base de cálculo | `creatorAmount` (valor líquido do criador após taxa da plataforma) |

### 8.2 Fluxo

1. Criador cria programa de afiliados com % de comissão
2. Afiliado gera link de indicação
3. Fã acessa link → cria `affiliateReferral` (vínculo fã-criador-afiliado)
4. Fã paga assinatura → `distributeCommissions()` calcula comissão em BRL
5. Comissão convertida para FanCoins e creditada ao afiliado via `creditEarnings()`
6. **Deduzido do valor do criador**: criador recebe `creatorAmount - totalCommissionBrl`

### 8.3 Pontos de Aplicação

Chamado em toda ativação/renovação de assinatura:
- `activateSubscription()` (direta/free)
- `activateSubscriptionFromWebhook()` (MP)
- `recordSubscriptionPayment()` (MP recorrente)
- `handleOpenPixSubscriptionRenewal()` (OpenPix recorrente)
- Webhook de pagamento confirmado (MP PPV, FanCoins)

---

## 9. FAN COMMITMENT (Staking)

| Parâmetro | Valor |
|---|---|
| Durações disponíveis | 30, 60 ou 90 dias |
| Bônus na conclusão | 5% do valor locked |
| Penalidade retirada antecipada | 10% do valor locked |
| Mínimo | 100 FanCoins |
| Máximo | 1.000.000 FanCoins |

### Fluxo

1. Fã trava FanCoins (débito atômico do balance)
2. Ao completar duração: recebe de volta + bônus 5% (como `bonusBalance`, não sacável)
3. Retirada antecipada: penalidade 10% (recebe 90% de volta)

---

## 10. GUILDAS (Guilds)

| Parâmetro | Valor |
|---|---|
| Máx membros | 20 |
| Contribuição treasury padrão | 3% |
| Contribuição treasury máxima | 10% |
| Mín preço combo subscription | R$ 10,00 |
| Mín creator score | 50 |

### Treasury

- Quando criador em guilda recebe tip, uma % automática vai para o treasury da guilda
- Contribuição via `contributeTreasury()` (non-blocking)

---

## 11. PITCH (Crowdfunding)

| Parâmetro | Valor |
|---|---|
| Meta mínima | 1.000 FanCoins |
| Meta máxima | 10.000.000 FanCoins |
| Duração | 7 a 90 dias (padrão: 30) |
| Deadline de entrega | 90 dias |
| Taxa plataforma | **5% fixo** |
| Máx reward tiers | 10 |
| Fundo Ecossistema | Sim (1% adicional) |

---

## 12. BÔNUS E GRANTS

### 12.1 Creator Bonus (Bônus de Criador)

- Ativável pelo admin: `creator_bonus_enabled` (padrão: `false`)
- Valor: `creator_bonus_coins` (padrão: 1.000)
- Gatilho: criador atinge `creator_bonus_required_subs` assinantes (padrão: 1)
- Creditado como `bonusBalance` (não sacável)

### 12.2 Bonus Grants (Vesting)

| Regra de Vesting | Descrição |
|---|---|
| `never` | Nunca se torna sacável |
| `revenue` | Veste baseado em receita gerada (ex: rate 4% → precisa gerar 25x o bônus em receita) |
| `time` | Veste em data específica (`vestingUnlockAt`) |
| `condition` | Veste quando condição customizada é atendida |

Quando vesting completa: `bonusBalance` é reduzido, tornando os FanCoins sacáveis.

---

## 13. PRESENTES VIRTUAIS

| ID | Nome | Ícone | Custo (FanCoins) |
|---|---|---|---|
| `gift_heart` | Coração | heart | 10 |
| `gift_fire` | Fogo | flame | 50 |
| `gift_star` | Estrela | star | 100 |
| `gift_crown` | Coroa | crown | 500 |
| `gift_diamond` | Diamante | diamond | 1.000 |
| `gift_rocket` | Foguete | rocket | 5.000 |

---

## 14. CONFIGURAÇÕES DO ADMIN (Platform Settings)

Todas configuráveis via admin panel:

| Chave | Valor Padrão | Descrição |
|---|---|---|
| `platform_fee_percent` | 15 | Taxa base da plataforma (%) |
| `p2p_fee_percent` | 2 | Taxa transferência P2P (%) |
| `graduated_fees_enabled` | true | Habilita taxa regressiva |
| `fancoin_to_brl` | 0.01 | Valor de 1 FanCoin em BRL |
| `min_payout` | 50.0 | Saque mínimo em BRL |
| `manual_approval_threshold` | 500.0 | Saque acima desse valor requer aprovação |
| `max_daily_withdrawals` | 3 | Máx saques por dia |
| `max_daily_amount` | 10000.0 | Máx valor sacado por dia (BRL) |
| `cooldown_hours` | 24 | Horas entre saques |
| `creator_bonus_enabled` | false | Bônus para novos criadores |
| `creator_bonus_coins` | 1000 | Valor do bônus (FanCoins) |
| `creator_bonus_required_subs` | 1 | Assinantes necessários para bônus |

---

## 15. FLUXO FINANCEIRO COMPLETO (Exemplo: Tip de 1.000 FanCoins)

**Cenário**: Fã tier Ouro (1.10x) envia tip para criador com 600 assinantes (taxa 11%) que está em guilda (3%)

1. Fã debita **1.000 FC** do balance (`bonusBalance` consumido primeiro)
2. Taxa ajustada: `11% / 1.10 = 10,00%` → Platform cut: **100 FC**
3. Após taxa: **900 FC**
4. Fundo Ecossistema: `900 × 1% = 9 FC` → Wallet ecossistema recebe 9 FC
5. Criador recebe: **891 FC**
6. Guild treasury: `891 × 3% = 26 FC` (deduzido do criador, não adicional)
7. Revenue vesting: processa grants do criador baseado nos 891 FC ganhos

**Resumo**:

| Destino | Valor | % do total |
|---|---|---|
| Fã pagou | 1.000 FC | — |
| Plataforma | 100 FC | 10,0% |
| Fundo Eco | 9 FC | 0,9% |
| Guild Treasury | 26 FC | 2,6% |
| **Criador líquido** | **~865 FC** | **86,5%** |

---

## 16. VARIÁVEIS DE AMBIENTE RELACIONADAS

| Variável | Descrição |
|---|---|
| `MERCADOPAGO_ACCESS_TOKEN` | Token de acesso MercadoPago |
| `MERCADOPAGO_SANDBOX` | `true` para sandbox MP |
| `OPENPIX_APP_ID` | App ID do OpenPix (Woovi) |
| `OPENPIX_SANDBOX` | `true` para sandbox OpenPix |
| `OPENPIX_WEBHOOK_SECRET` | Secret para validar webhooks OpenPix |
| `API_URL` | URL base da API (para webhooks) |
| `NEXT_PUBLIC_APP_URL` | URL do frontend |

---

*Documento gerado em 21/02/2026 a partir do código-fonte em `origin/main` (commit `7ef15db`).*

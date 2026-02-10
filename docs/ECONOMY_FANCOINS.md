# Economia FanCoins — Regras, T&C e FAQ

> Este documento define todas as regras da economia de FanCoins.
> Deve servir como base para: Termos e Condicoes, FAQ publica, e implementacao tecnica.

---

## 1. Natureza do FanCoin

### 1.1 Definicao

FanCoins sao creditos digitais de consumo interno da plataforma FanDreams.
NAO constituem ativo financeiro, criptomoeda, valor mobiliario ou investimento.

FanCoins funcionam como creditos prepagos para consumo de conteudo e servicos
dentro da plataforma — similar a fichas de cassino, milhas aereas, creditos de
celular ou V-Bucks (Fortnite).

### 1.2 Caracteristicas Legais

- **Nao sao valores mobiliarios**: nao representam participacao em empresa, nao
  geram direito a dividendos, nao sao ofertados como investimento
- **Nao sao ativos virtuais** (Lei 14.478/2022): se enquadram na exclusao de
  programas de fidelidade e recompensas
- **Nao tem mercado secundario**: nao podem ser negociados, vendidos ou
  transferidos entre usuarios fora dos mecanismos da plataforma (tips, PPV, etc.)
- **Nao tem supply fixo**: sao criados sob demanda quando comprados e consumidos
  quando gastos. Nao existe pre-venda, ICO ou limite de emissao
- **Preco fixo de compra**: 1 FanCoin = R$ 0,01 (ajustavel pela plataforma)

### 1.3 Enquadramento Regulatorio Brasil

| Regulador | Aplicavel? | Motivo |
|-----------|-----------|--------|
| CVM | Nao | Nao e valor mobiliario. Token de utilidade para consumo |
| BACEN | Nao | Excluido pela Lei 14.478/2022 (programa de recompensas) |
| CDC | Sim | Relacao de consumo. Protecao ao consumidor se aplica |
| Receita Federal | Sim | Criadores devem declarar receita de saques como renda |

---

## 2. Tipos de Saldo

A wallet do usuario possui os seguintes saldos:

### 2.1 Saldo Total (`balance`)

Total de FanCoins disponiveis para **gastar** na plataforma (tips, PPV, presentes,
assinaturas, kits, votacoes).

### 2.2 Saldo Bonus / Nao-Sacavel (`bonusBalance`)

FanCoins que podem ser **gastos** normalmente na plataforma mas que **NAO podem
ser sacados** como dinheiro real. Inclui:

- FanCoins comprados (base + bonus de pacote)
- Bonus de boas-vindas do criador
- Recompensas de engajamento (login diario, likes, comentarios, etc.)
- Premios ainda em periodo de carencia

### 2.3 Saldo Sacavel (calculado)

```
saldoSacavel = saldoTotal - saldoBonus
```

Apenas FanCoins recebidos de **outros usuarios** atraves de atividade como
criador sao sacaveis:

- Tips recebidos de fans
- PPV recebido (desbloqueio de conteudo)
- Receita de assinaturas
- Comissoes de afiliado

### 2.4 Saldo em Vesting (tabela `bonus_grants`)

Bonus com desbloqueio progressivo. A medida que o criador gera receita real,
parte do bonus e transferido de "nao-sacavel" para "sacavel".

---

## 3. Pacotes de Compra

| Pacote | FanCoins | Preco | Bonus | Total |
|--------|----------|-------|-------|-------|
| pack_100 | 100 | R$ 1,00 | 0 | 100 FC |
| pack_500 | 500 | R$ 5,00 | 50 (+10%) | 550 FC |
| pack_1000 | 1.000 | R$ 10,00 | 200 (+20%) | 1.200 FC |
| pack_5000 | 5.000 | R$ 50,00 | 1.500 (+30%) | 6.500 FC |
| pack_10000 | 10.000 | R$ 100,00 | 5.000 (+50%) | 15.000 FC |

**IMPORTANTE**: Todos os FanCoins de compra (base + bonus) sao classificados
como **nao-sacaveis** (`bonusBalance`). Podem ser gastos normalmente em tips,
PPV, presentes, kits, etc., mas nao podem ser convertidos em dinheiro real.

**Racional**: FanCoins comprados sao creditos de consumo, nao receita.
O bonus de compra e um incentivo para gastar mais na plataforma, nao para
gerar lucro via saque.

---

## 4. Regras de Gasto (Spending)

Ao gastar FanCoins (tip, PPV, votacao, kit, etc.):

1. O sistema consome `bonusBalance` primeiro (FIFO de bonus)
2. Depois consome o saldo "sacavel"
3. Operacao atomica: `bonusBalance = GREATEST(0, bonusBalance - valorGasto)`

**Exemplo:**
```
Saldo: 20.000 FC | Bonus: 15.000 FC | Sacavel: 5.000 FC

Fan envia tip de 10.000 FC:
  → bonusBalance = max(0, 15.000 - 10.000) = 5.000 FC
  → Saldo: 10.000 FC | Bonus: 5.000 FC | Sacavel: 5.000 FC

Fan envia outro tip de 8.000 FC:
  → bonusBalance = max(0, 5.000 - 8.000) = 0 FC
  → Saldo: 2.000 FC | Bonus: 0 FC | Sacavel: 2.000 FC
```

Isso protege a plataforma: bonus e gasto antes da receita real.

---

## 5. Regras de Saque (Withdrawal)

### 5.1 Quem Pode Sacar

- Somente usuarios com role `creator` ou `admin`
- KYC aprovado obrigatorio
- Fans NAO podem sacar (nao tem receita, so bonus)

### 5.2 Limites

| Parametro | Valor Padrao |
|-----------|-------------|
| Saque minimo | R$ 50,00 |
| Maximo por dia | R$ 10.000,00 |
| Saques por dia | 3 |
| Cooldown entre saques | 24 horas |
| Aprovacao manual | >= R$ 500,00 |

### 5.3 O Que Pode Ser Sacado

**SOMENTE** o saldo sacavel (`balance - bonusBalance`):

```
Pode sacar: tips recebidos, PPV recebido, assinaturas, comissoes afiliado
NAO pode sacar: coins comprados, bonus compra, bonus boas-vindas,
                 recompensas engajamento, premios em carencia
```

Se o criador tentar sacar mais que o saldo sacavel, recebe erro:
`BONUS_NOT_WITHDRAWABLE` com mensagem explicativa.

### 5.4 Guarda Atomica

O SQL de saque verifica AMBAS as condicoes atomicamente:
```sql
WHERE balance >= valor AND (balance - bonus_balance) >= valor
```
Isso impede race conditions onde bonus poderia ser sacado em requests paralelos.

### 5.5 Anti-Fraude

Cada saque recebe um `riskScore` baseado em:

| Flag | Score | Condicao |
|------|-------|----------|
| DAILY_LIMIT_EXCEEDED | +100 (bloqueia) | Mais de 3 saques no dia |
| DAILY_AMOUNT_EXCEEDED | +100 (bloqueia) | Mais de R$ 10K no dia |
| COOLDOWN_ACTIVE | +50 | Saque nas ultimas 24h |
| ABOVE_MANUAL_THRESHOLD | +30 | Valor >= R$ 500 |
| VERY_NEW_ACCOUNT | +40 | Conta < 7 dias |
| NEW_ACCOUNT | +15 | Conta < 30 dias |
| HIGH_WITHDRAWAL_RATIO | +25 | Sacando > 90% do totalEarned |
| FULL_WITHDRAWABLE_DRAIN | +20 | Sacando > 95% do sacavel |
| NEW_CREATOR_LOW_EARNINGS | +35 | Criador < 30 dias + earnings baixas |

Score >= 50 OU valor >= R$ 500: requer aprovacao manual do admin.

---

## 6. Sistema de Vesting

### 6.1 Conceito

Alguns bonus tem desbloqueio progressivo ("vesting"). A medida que o criador
gera receita real de fans, parte do bonus se torna sacavel.

### 6.2 Tipos de Bonus e Regras

| Tipo | Sacavel? | Regra |
|------|----------|-------|
| Bonus de compra (pacotes) | NUNCA | Credito de consumo, nunca vira sacavel |
| Bonus de boas-vindas criador | VESTING | Desbloqueia proporcional a receita real |
| Recompensas engajamento | NUNCA | Gamificacao, so para gastar |
| Premio de campanha/battle | CARENCIA | Sacavel apos periodo (ex: 30 dias) + criador ativo |
| Bonus de indicacao/referral | CONDICIONAL | Sacavel apos indicado completar acao (ex: 1a compra) |
| Comissao de afiliado | JA SACAVEL | Vem de pagamento real de outro usuario |

### 6.3 Formula de Vesting (Bonus Criador)

```
taxaVesting = taxaPlataforma × multiplicador
            = 8% × 0.5
            = 4%

bonusDesbloqueado = min(bonusTotal, receitaReal × taxaVesting)
```

**Exemplo:**
```
Bonus boas-vindas: 10.000 FC (R$ 100,00)
Taxa de vesting: 4%

Criador ganha R$ 500 de fans  → desbloqueia R$ 20  (2.000 FC)
Criador ganha R$ 1.500 de fans → desbloqueia R$ 60  (6.000 FC)
Criador ganha R$ 2.500 de fans → desbloqueia R$ 100 (10.000 FC) = 100%

Economia da plataforma:
  Receita: R$ 2.500 × 8% = R$ 200
  Custo bonus: R$ 100
  LUCRO: R$ 100 (plataforma SEMPRE lucra)
```

### 6.4 Bonus que Nao Veste

Se o criador nao atingir a meta de vesting:
- O bonus NAO expira
- Continua disponivel para gastar na plataforma
- Mas nunca se torna sacavel
- Se o criador voltar a ser Fan, o bonus permanece (pode gastar em tips/PPV)

---

## 7. Fundo do Ecossistema

### 7.1 Conceito

1% de cada transacao (tips, PPV, votacoes, etc.) e direcionado para um
Fundo do Ecossistema, gerido pela plataforma.

### 7.2 Calculo

```
Tip de 1.000 FC:
  Criador recebe: 910 FC (- 8% taxa - 1% fundo)
  Plataforma: 80 FC (taxa)
  Fundo: 10 FC

Total debitado do fan: 1.000 FC
```

### 7.3 Uso do Fundo

O Fundo Ecossistema financia:
- Premios de Guild Wars
- Bonus de boas-vindas para novos criadores
- Conteudo da Academy
- Campanhas de growth e marketing
- Desenvolvimento de novas features

### 7.4 Diferenca de "Burn"

FanCoins do fundo NAO sao destruidos. Sao redirecionados para uso interno
da plataforma. Isso evita a narrativa de "deflacao" (que poderia atrair
atencao da CVM) e garante que o valor retorna para a comunidade.

**Narrativa**: "1% de cada transacao volta para a comunidade".

---

## 8. Taxas da Plataforma

| Transacao | Taxa Plataforma | Fundo Ecossistema | Criador Recebe |
|-----------|----------------|-------------------|----------------|
| Assinatura | 8% | 1% | 91% |
| Tip | 8% | 1% | 91% |
| PPV | 8% | 1% | 91% |
| Sponsor (Connect) | 15% | 0% | 85% |
| Pitch (crowdfunding) | 8% | 0% | 92% |
| Kit (Studio) | margem atacado | 0% | N/A |

---

## 9. Fan Tiers e Poder de Compra

| Tier | XP Minimo | Multiplicador | Exemplo: tip de 1.000 FC |
|------|-----------|---------------|--------------------------|
| Bronze | 0 | 1.00x | Criador recebe 910 FC |
| Prata | 1.000 | 1.05x | Criador recebe 955 FC |
| Ouro | 5.000 | 1.10x | Criador recebe 1.001 FC |
| Diamante | 25.000 | 1.20x | Criador recebe 1.092 FC |
| Obsidian | 100.000 | 1.30x | Criador recebe 1.183 FC |

**Nota**: Tier baseado em XP (gasto acumulado), nao saldo. Premia atividade.

---

## 10. Fan Commitment (Lock de FanCoins)

### Regras

- Fan escolhe criador e periodo (30, 60 ou 90 dias)
- FanCoins ficam travados (nao pode gastar/sacar)
- Ao final: coins devolvidos + bonus 5% (nao-sacavel)
- Se retirar antes: coins devolvidos (24h cooldown), perde beneficios e bonus
- Sem penalidade financeira (nao perde FanCoins)

### Beneficios Para o Fan

- Badge exclusivo no perfil
- Acesso a grupo VIP do criador
- Multiplicador XP: 1.5x
- Desconto 15% em PPV desse criador
- Destaque nos comentarios

### Enquadramento Legal

Programa de fidelidade com lock-in. NAO e investimento porque:
- Nao ha retorno financeiro (bonus e nao-sacavel)
- Coins sao DEVOLVIDOS, nao multiplicados
- Beneficios sao ACESSO A CONTEUDO
- Sem penalidade financeira por retirada

---

## 11. FAQ — Perguntas Frequentes

### Geral

**Q: O que sao FanCoins?**
A: FanCoins sao creditos digitais para usar dentro da plataforma FanDreams.
Voce pode usa-los para enviar tips, desbloquear conteudo, participar de
votacoes, comprar kits e muito mais.

**Q: FanCoins sao criptomoeda?**
A: Nao. FanCoins sao creditos de consumo interno, como milhas aereas ou
creditos de jogos. Nao podem ser negociados fora da plataforma.

**Q: O preco do FanCoin pode mudar?**
A: O preco de compra e fixo (R$ 0,01 por FanCoin). O que pode mudar sao os
beneficios e features que FanCoins podem acessar conforme a plataforma cresce.

### Compras

**Q: Comprei FanCoins, posso sacar eles depois?**
A: Nao. FanCoins comprados sao para uso dentro da plataforma (tips, PPV,
presentes, kits). Eles nao podem ser convertidos de volta em dinheiro.

**Q: E o bonus de compra, posso sacar?**
A: Nao. O bonus de compra e um incentivo adicional para voce aproveitar mais
a plataforma. Pode ser gasto normalmente, mas nao sacado.

**Q: Posso usar FanCoins de compra para comprar kits de producao?**
A: Sim! FanCoins nao-sacaveis podem ser usados para comprar kits no
FanDreams Studio. E uma otima forma de investir no seu conteudo.

### Saques (Criadores)

**Q: Como faco para sacar meus FanCoins?**
A: Va em Configuracoes > Saques. Somente FanCoins RECEBIDOS de outros
usuarios (tips, PPV, assinaturas) podem ser sacados. Voce precisa ser
criador verificado (KYC aprovado).

**Q: Por que meu saldo sacavel e menor que meu saldo total?**
A: Seu saldo total inclui FanCoins de compras, bonus e recompensas, que so
podem ser gastos na plataforma. O saldo sacavel mostra apenas o que voce
GANHOU de outros usuarios.

**Q: Recebi um bonus de boas-vindas. Posso sacar?**
A: O bonus de boas-vindas tem sistema de vesting. Conforme voce gera receita
real de fans, parte do bonus se desbloqueia para saque. Consulte a secao
"Vesting" no seu painel para ver o progresso.

**Q: Quanto tempo leva para sacar?**
A: PIX: instantaneo. Transferencia bancaria: 1-3 dias uteis.
Crypto (USDT): 10-30 minutos. Saques acima de R$ 500 requerem aprovacao
manual (ate 24h).

### Bonus e Vesting

**Q: Como funciona o vesting do bonus de criador?**
A: Para cada R$ 1 que voce ganha de fans reais, 4% do seu bonus se desbloqueia.
Exemplo: bonus de R$ 100 se desbloqueia totalmente apos R$ 2.500 em receita.

**Q: Meu bonus expira?**
A: Nao. O bonus nunca expira. Se voce nao atingir a meta de vesting, ele
continua disponivel para gastar na plataforma.

**Q: Se eu desistir de ser criador, perco meu bonus?**
A: Nao. Os FanCoins permanecem na sua wallet e podem ser gastos normalmente.
Mas como fan, voce nao pode fazer saques.

### Fundo Ecossistema

**Q: O que e o Fundo do Ecossistema?**
A: 1% de cada transacao e direcionado para um fundo que financia premios de
competicoes, bonus para novos criadores, conteudo educacional e melhorias na
plataforma. E a comunidade reinvestindo em si mesma.

### Seguranca

**Q: Posso perder meus FanCoins?**
A: FanCoins nao expiram e nao podem ser perdidos por inatividade. Sua wallet
e protegida por autenticacao e todas as transacoes sao atomicas (nao ha risco
de duplicacao ou perda).

**Q: E se a plataforma fechar?**
A: FanCoins sao creditos de consumo e nao constituem deposito bancario.
Recomendamos que criadores faquem saques regularmente. Em caso de encerramento,
a plataforma seguira as obrigacoes do CDC para reembolso.

---

## 12. Glossario

| Termo | Definicao |
|-------|-----------|
| FanCoin (FC) | Credito digital de consumo da plataforma FanDreams |
| Saldo Total | Total de FanCoins disponiveis para gastar |
| Saldo Bonus | FanCoins nao-sacaveis (compras, bonus, recompensas) |
| Saldo Sacavel | FanCoins que podem ser convertidos em BRL (ganhos de fans) |
| Vesting | Processo de desbloqueio progressivo de bonus para saque |
| Fundo Ecossistema | 1% das transacoes reinvestido na comunidade |
| Creator Score | Pontuacao de reputacao do criador (0-100) |
| Guild | Grupo/cla de criadores com tesouro e beneficios compartilhados |
| Fan Commitment | Lock voluntario de FanCoins com beneficios exclusivos |
| Fan Tier | Nivel de fidelidade baseado em gasto acumulado |
| FanDreamsPitch | Crowdfunding de conteudo (pre-venda, nao investimento) |

# FanDreams — Visao Estrategica da Plataforma

> Documento complementar ao `ESTUDO_ESTRATEGICO.md`.
> Foco: arquitetura multi-marca, ecossistema de features e roadmap de produto.

---

## 1. Modelo de Marcas

### Arquitetura Holding

```
FanDreams Inc. (holding)
├── FanDreams (NSFW) — marca principal, pronta para lancamento
├── [SFW_BRAND] (SFW) — marca multi-categoria, lancamento futuro
└── Infraestrutura compartilhada (backend, FanCoins, KYC, pagamentos)
```

### FanDreams (NSFW) — Marca Principal

- **Publico**: Criadores de conteudo adulto/premium/exclusivo
- **Posicionamento**: "A plataforma que paga mais e cuida do criador"
- **Diferenciais vs OnlyFans**: taxa 8% (vs 20%), FanCoins, Guilds, Academy, Analytics
- **Categorias**: Adulto, Sensual, Fetiche, Couples, Cosplay 18+, Fitness 18+, Lifestyle 18+
- **Distribuicao**: Web (dominio principal) + PWA (sem app store)
- **Pagamentos**: Processadoras especializadas (CCBill, Segpay) + PIX + Crypto
- **Marketing**: Redes sociais adultas, criadores influenciadores, afiliados

### [SFW_BRAND] (SFW) — Marca Multi-Categoria (Futuro)

- **Publico**: Criadores de conteudo educacional, fitness, musica, arte, culinaria, gaming, lifestyle
- **Posicionamento**: "O Hotmart dos criadores independentes + comunidade"
- **Categorias**: Fitness, Educacao, Musica, Culinaria, Arte, Lifestyle, Gaming, Cosplay SFW, Cursos
- **Distribuicao**: App nativo iOS/Android + Web
- **Pagamentos**: Visa/MC/PIX normalmente (sem restricoes)
- **Marketing**: App stores, sponsors, parcerias com marcas, influenciadores mainstream

**Candidatos a nome (pendente decisao):**

| Nome | Conceito |
|------|----------|
| Creatify | Create + Amplify — moderno, tech, claro |
| Luminar | Iluminar — aspiracional, bonito em PT/EN |
| Ignite | Acender — energia criativa |
| Elevate | Elevar — crescimento profissional |
| Sparkr | Faisca — criatividade, moderno |

### Infraestrutura Compartilhada

Ambas as marcas usam o mesmo backend:

- **FanCoins**: wallet unica, economia unificada, FanCoins comprados em qualquer marca funcionam em ambas
- **SSO**: login unico entre plataformas
- **KYC**: verificacao de identidade compartilhada
- **Pagamentos**: processamento centralizado (cada marca com seus providers)
- **Guilds**: guilds podem ter membros de ambas as plataformas
- **Creator Score**: score unificado
- **Anti-fraude**: sistema dual-balance compartilhado

### Separacao de Marca

- Dominios separados
- UI/branding completamente diferentes
- Redes sociais separadas
- Nenhuma referencia cruzada publica
- CNPJ pode ser o mesmo (holding), marcas comerciais diferentes
- Sponsors do [SFW_BRAND] nunca veem associacao com FanDreams

---

## 2. Ecossistema de Features

### 2.1 FanDreams Studio — Kits de Producao

Marketplace de equipamentos para criadores. Nenhum concorrente oferece isso.

**Kits:**

| Tier | Conteudo | Preco BRL | Preco FanCoins (bonus) |
|------|----------|-----------|------------------------|
| Iniciante | Ring light + suporte celular + backdrop + guia digital | R$ 199 | 19.900 FC |
| Creator | Iluminacao LED 2x + tripe + mic wireless + green screen + 3 meses software | R$ 599 | 59.900 FC |
| Pro | Camera mirrorless + iluminacao 3 pontos + mic condensador + 1 ano software + consultoria | R$ 1.499 | 149.900 FC |

**Modelo de negocio:**

- Compra no atacado (margem ~40%)
- Venda a preco de custo ou margem minima
- Aceita FanCoins nao-sacaveis como pagamento (custo real = atacado, bonus sai de circulacao)
- Parcelamento deduzido dos ganhos futuros (retention de 6-12 meses)

**Estrategia**: Bonus coins ganham valor real percebido. Criador investe equipamento na plataforma = retention.

### 2.2 FanDreams Connect — Marketplace de Sponsors

Marketplace que conecta marcas com criadores para conteudo patrocinado.
Exclusivo para [SFW_BRAND] (marcas nao se associam com NSFW).

**Para marcas:**
- Publicam campanhas com orcamento e requisitos
- Buscam criadores por categoria, Creator Score, subscribers
- Contratos automatizados pela plataforma
- Metricas de performance (views, cliques, conversao)
- Pagam so quando conteudo e publicado

**Para criadores:**
- Segundo fluxo de receita (alem de assinaturas)
- Candidatam-se a campanhas compativeis
- Requisitos: Creator Score > 70, 100+ subs, KYC aprovado, sem violacoes 90 dias

**Receita plataforma**: 15% do valor da campanha.

### 2.3 FanDreamsPitch — Crowdfunding de Conteudo

Pre-venda de projetos de criadores. NAO e equity crowdfunding (sem implicacoes CVM).

**Funcionamento:**
1. Criador publica projeto com meta em FanCoins e recompensas por tier
2. Fans apoiam com FanCoins
3. Se meta atingida: criador recebe 92% (- 8% taxa), prazo de entrega comeca
4. Se meta NAO atingida: FanCoins devolvidos integralmente
5. Se nao entregar em 90 dias: reembolso automatico
6. Fans avaliam o conteudo final

**Protecoes:**
- Creator Score minimo: 60
- Historico de entregas visivel no perfil
- Se avaliacao < 3/5: perde elegibilidade futura

**Enquadramento legal**: Pre-venda de conteudo (CDC), nao investimento (CVM).
Analogia: Catarse, Kickstarter rewards, pre-venda Hotmart.

### 2.4 Guilds (Clas de Criadores)

Entidades economicas dentro da plataforma. Agency descentralizada.

**Estrutura:**
- Lider + co-lider + membros (max ~20)
- Tesouro compartilhado (contribuicao configuravel, ex: 3% dos ganhos)
- Uso do tesouro aprovado por votacao dos membros
- Entrada: convite de membro + Creator Score > 50

**Beneficios:**
- Assinatura combo (fan paga um preco e acessa todos os criadores da guild)
- Cross-promo automatica entre membros
- Mentoria interna (tops ajudam novatos)
- Campanhas de sponsors compartilhadas (Connect)
- Guild Wars (competicoes mensais entre guilds, premios do Fundo Ecossistema)

**Assinatura de Guild:**
- Fan paga preco unico (ex: R$ 39,90/mes) por acesso a todos os membros
- Divisao proporcional ao engagement de cada criador
- Economia para o fan: 50-80% vs assinar individualmente
- Volume para criadores: mais subscribers

**Guild Wars:**
- Competicoes mensais baseadas em engagement rate + novos subs + retencao
- Premios: FanCoins (do Fundo Ecossistema) + selo + destaque
- Fans podem "torcer" pela guild (commitment de FanCoins)

### 2.5 FanDreams Academy

Educacao gratuita para todos os criadores.

**Trilhas:**
- Producao de Conteudo (fotografia, video, audio, edicao)
- Marketing e Crescimento (marca pessoal, precos, copy, redes sociais)
- Financas e Negocios (imposto, MEI vs ME, controle financeiro, negociacao com marcas)
- Bem-estar e Sustentabilidade (saude mental, limites, haters, carreira longo prazo)

**Professores**: criadores TOP da plataforma (pagos em FanCoins + destaque + badge).
**Certificado**: selo no perfil "Academy Graduate".
**Beneficios**: +20% boost discovery, elegibilidade sponsors, acesso mentoria 1:1.

### 2.6 Creator Score

Reputacao publica do criador. Determina acesso a features.

**Composicao:**
- Qualidade de conteudo (engagement rate)
- Consistencia (frequencia de posts)
- Retencao de fans (churn rate)
- Comunidade (respostas, interacao)
- Profissionalismo (sem violacoes, KYC ok)
- Academy (trilhas completas)

**Desbloqueios:**

| Score | Nivel | Beneficios |
|-------|-------|------------|
| 0-49 | Basico | Funcionalidades padrao |
| 50-69 | Ativo | Guilds, analytics avancado |
| 70-84 | Verificado | Sponsors (Connect), guild leader, FanDreamsPitch |
| 85-94 | Top | Saque rapido (sem cooldown), mentoria, destaque |
| 95-100 | Elite | Parceiro da plataforma, revenue share especial, eventos |

### 2.7 Fan Co-Production

Fans votam no proximo conteudo do criador (votacao custa FanCoins).

- Criador posta opcoes, fans votam gastando FanCoins
- Fans que votaram no vencedor: badge "Co-Producer", acesso antecipado, credito no post
- Criador recebe receita ANTES de produzir
- Engajamento altissimo (fan investiu no conteudo)
- 1% fundo ecossistema nos votos

### 2.8 Fan Commitment (Staking de Perks)

Lock voluntario de FanCoins com um criador por periodo (30/60/90 dias).

**Fan recebe:**
- Badge exclusivo no perfil
- Acesso a grupo VIP do criador
- Multiplicador XP (1.5x)
- Desconto em PPV desse criador (15%)
- Destaque nos comentarios (cor especial)

**Ao final do periodo:**
- Coins devolvidos integralmente
- Bonus de conclusao (5% nao-sacavel)

**Se retirar antes:**
- Coins devolvidos em 24h (cooldown)
- Perde TODOS os beneficios imediatamente
- Perde o bonus de conclusao
- NAO perde nenhum FanCoin (sem penalidade financeira)

**Enquadramento legal**: Programa de fidelidade com lock-in. Nao e investimento porque:
nao ha retorno financeiro, coins sao devolvidos (nao multiplicados), beneficios sao acesso a conteudo.

### 2.9 Fan Tiers v2 — Poder de Compra Progressivo

Tier baseado em GASTO ACUMULADO (nao saldo). Premia atividade, nao acumulo.

| Tier | XP Minimo | Poder de Compra | Beneficios |
|------|-----------|-----------------|------------|
| Bronze | 0 | 1.00x | Padrao |
| Prata | 1.000 | 1.05x (+5%) | Badge prata |
| Ouro | 5.000 | 1.10x (+10%) | Lives exclusivas, prioridade respostas |
| Diamante | 25.000 | 1.20x (+20%) | DM direto, desconto assinaturas |
| Obsidian | 100.000 | 1.30x (+30%) | Eventos exclusivos, selo Super Fan, afiliados premium |

**Economia**: Quando fan Diamante envia 1.000 FC, criador recebe como se fossem 1.200 FC.
A plataforma absorve a diferenca via ajuste na taxa (8% sobre o valor efetivo, nao o base).

### 2.10 Seasons Trimestrais

Cada trimestre traz dinamismo sem mudar o preco base dos FanCoins.

Exemplos:
- Season 1: Bonus de compra +10% extra
- Season 2: Fundo ecossistema reduzido (0.5% em vez de 1%)
- Season 3: Multiplicador XP 2x para comprometidos
- Season 4: Pacotes promocionais especiais

---

## 3. Diferenciais Competitivos Consolidados

| Feature | OnlyFans | Fansly | Privacy | FanDreams |
|---------|----------|--------|---------|-----------|
| Taxa | 20% | 20% | 15-20% | **8%** |
| Moeda propria | Nao | Nao | Nao | **FanCoins** |
| Dual-balance anti-fraude | Nao | Nao | Nao | **Sim** |
| Vesting de bonus | Nao | Nao | Nao | **Sim** |
| Kits producao | Nao | Nao | Nao | **Studio** |
| Sponsors marketplace | Nao | Nao | Nao | **Connect** |
| Crowdfunding conteudo | Nao | Nao | Nao | **Pitch** |
| Guilds/Clas | Nao | Nao | Nao | **Sim** |
| Academy gratuita | Nao | Nao | Nao | **Sim** |
| Creator Score | Nao | Nao | Nao | **Sim** |
| Fan Co-Production | Nao | Nao | Nao | **Sim** |
| Fan Commitment | Nao | Nao | Nao | **Sim** |
| Fan Tiers c/ poder compra | Nao | Nao | Nao | **Sim** |
| Seasons | Nao | Nao | Nao | **Sim** |
| Afiliados multi-nivel | Nao | Basico | Nao | **2 niveis** |
| Marca SFW separada | N/A | N/A | N/A | **[SFW_BRAND]** |

---

## 4. Roadmap de Implementacao

### Fase 1 — Fundacao (Sprint atual)
- [x] Sistema dual-balance (bonusBalance) — anti-fraude
- [ ] Sistema de vesting (tabela `bonus_grants`)
- [ ] Fundo ecossistema (1% transacao)
- [ ] Documento ECONOMY.md (T&C + FAQ)

### Fase 2 — Diferenciacao (Curto prazo)
- [ ] Creator Score (schema + calculo + API)
- [ ] Guild system (tabelas, treasury, assinatura combo)
- [ ] Fan tiers v2 com poder de compra
- [ ] FanDreamsPitch (crowdfunding basico)

### Fase 3 — Ecossistema (Medio prazo)
- [ ] FanDreams Studio (kits, pagamento em bonus coins)
- [ ] FanDreams Connect (marketplace sponsors) — exclusivo [SFW_BRAND]
- [ ] Fan Co-Production (votacao paga)
- [ ] Fan Commitment (staking de perks)

### Fase 4 — Escala (Longo prazo)
- [ ] FanDreams Academy (cursos, certificacao)
- [ ] Guild Wars (competicoes)
- [ ] Seasons trimestrais
- [ ] Lancamento [SFW_BRAND]
- [ ] App nativo iOS/Android para [SFW_BRAND]
- [ ] Dashboard economia publica

---

## 5. Projeccao de Receita (Estimativa Ano 1)

### FanDreams (NSFW) — Marca Principal

| Fonte | Volume Mensal | Taxa | Receita Mensal |
|-------|--------------|------|---------------|
| Assinaturas | R$ 2M | 8% | R$ 160K |
| Tips/PPV | R$ 1M | 8% | R$ 80K |
| Mensagens pagas | R$ 300K | 8% | R$ 24K |
| Fundo ecossistema | R$ 3.3M GMV | 1% | R$ 33K |
| **Total NSFW** | | | **~R$ 297K/mes** |

### [SFW_BRAND] (Futuro)

| Fonte | Volume Mensal | Taxa | Receita Mensal |
|-------|--------------|------|---------------|
| Assinaturas | R$ 500K | 8% | R$ 40K |
| Tips/PPV | R$ 200K | 8% | R$ 16K |
| Connect (sponsors) | R$ 100K | 15% | R$ 15K |
| Studio (kits) | R$ 50K | 30% | R$ 15K |
| Pitch (crowdfunding) | R$ 80K | 8% | R$ 6.4K |
| **Total SFW** | | | **~R$ 92K/mes** |

### Total Consolidado: ~R$ 389K/mes (Ano 1)

Split: ~76% NSFW / ~24% SFW. Com o tempo SFW cresce por sponsors + app store + categorias amplas.

---

## 6. Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|----------|
| Marcas descobrem associacao com NSFW | Dominios, CNPJ marcas, redes sociais totalmente separados |
| App store rejeita [SFW_BRAND] | App 100% SFW, sem nenhuma referencia a FanDreams |
| Processadoras bloqueiam NSFW | Processadoras especializadas (CCBill, Segpay) + PIX + crypto |
| Criadores NSFW nao querem plataforma "mista" | FanDreams e 100% focada neles. [SFW_BRAND] e marca separada |
| Diluicao de foco | P&L separado, metricas separadas, times de produto podem ser separados |
| Regulacao CVM/BACEN | FanCoins = token de utilidade, sem supply fixo, sem mercado secundario |

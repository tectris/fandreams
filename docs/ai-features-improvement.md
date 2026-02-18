# FanDreams AI Features - Improvement Plan

> Documento de planejamento para implementacao de recursos de IA via LLM API.
> Status: **BETA/DEV** - Aguardando ambiente de desenvolvimento para testes.
> Data: 2026-02-18

---

## Sumario Executivo

Este documento detalha a implementacao de recursos de IA generativa na plataforma FanDreams
usando APIs de LLM (Gemini, Claude, GPT). O foco e maximizar valor agregado para criadores
e fas com custo controlado de processamento.

**Estimativa de custo total:** ~$500-700/mes para 10.000 usuarios ativos (com cache otimizado).

---

## Arquitetura Tecnica

### Camada de Servico AI

```
apps/api/src/services/ai/
  ├── ai-router.ts          # Roteamento de modelo por feature
  ├── ai-cache.ts           # Cache Redis para respostas
  ├── ai-budget.ts          # Controle de orcamento por feature
  ├── ai-usage.ts           # Tracking de tokens por usuario
  ├── providers/
  │   ├── gemini.ts         # Google Gemini Flash (default)
  │   ├── claude.ts         # Anthropic Claude Haiku (quality)
  │   └── openai.ts         # OpenAI GPT-4o Mini (fallback)
  └── features/
      ├── dream-caption.ts  # Gerador de legendas
      ├── fan-bot.ts        # Assistente de respostas
      ├── dream-mod.ts      # Moderacao inteligente
      ├── creator-coach.ts  # Insights com IA
      ├── pitch-writer.ts   # Assistente de campanhas
      ├── smart-feed.ts     # Resumos e discovery
      ├── guild-battle.ts   # Narrador de batalhas
      └── dream-translate.ts # Traducao automatica
```

### Dependencias Necessarias

```json
{
  "@google/generative-ai": "^0.21.0",
  "@anthropic-ai/sdk": "^0.32.0",
  "openai": "^4.70.0"
}
```

### Variaveis de Ambiente

```env
# AI Providers
GEMINI_API_KEY=
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# AI Budget Control
AI_DAILY_BUDGET_USD=50
AI_FEATURE_DREAM_CAPTION_ENABLED=true
AI_FEATURE_FAN_BOT_ENABLED=true
AI_FEATURE_DREAM_MOD_ENABLED=true
AI_FEATURE_CREATOR_COACH_ENABLED=true
AI_FEATURE_PITCH_WRITER_ENABLED=true
AI_FEATURE_SMART_FEED_ENABLED=true
AI_FEATURE_GUILD_BATTLE_ENABLED=true
AI_FEATURE_DREAM_TRANSLATE_ENABLED=true
```

### Modelo de Roteamento

| Feature | Modelo Primario | Fallback | Motivo |
|---------|----------------|----------|--------|
| DreamCaption | Gemini 2.0 Flash | GPT-4o Mini | Multimodal barato |
| FanBot | Gemini 2.0 Flash | Claude Haiku | Velocidade em respostas curtas |
| DreamMod | Gemini 2.0 Flash | Claude Haiku | Multimodal + classificacao |
| CreatorCoach | Claude 3.5 Haiku | Gemini Flash | Qualidade de analise |
| PitchWriter | Gemini 2.0 Flash | Claude Haiku | Bom em texto criativo |
| SmartFeed | Gemini Embedding | - | Embeddings gratuitos |
| GuildBattle AI | Gemini 2.0 Flash Lite | GPT-4o Mini | Ultra-economico |
| DreamTranslate | Gemini 2.0 Flash Lite | GPT-4o Mini | Traducao simples |

---

## Feature 1: DreamCaption

### Descricao
Gerador de legendas e hashtags para criadores com base na imagem do post.

### Prioridade: ALTA
### Complexidade: BAIXA
### Custo: ~$50/mes (10k usuarios)

### Fluxo
1. Criador seleciona imagem no editor de post
2. Clica no botao "Sugerir legenda" (icone de IA)
3. API envia imagem + contexto do criador para Gemini Flash
4. Retorna 3 opcoes de legenda + hashtags sugeridas
5. Criador escolhe, edita ou ignora

### API Endpoint

```
POST /api/v1/ai/dream-caption
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
  - image: File (obrigatorio)
  - tone: "casual" | "formal" | "provocative" (opcional, default: "casual")
  - language: "pt-BR" | "en" | "es" (opcional, default: "pt-BR")

Response:
{
  "captions": [
    { "text": "Legenda sugerida 1", "tone": "casual" },
    { "text": "Legenda sugerida 2", "tone": "formal" },
    { "text": "Legenda sugerida 3", "tone": "provocative" }
  ],
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "bestTime": "19:30" // baseado em analytics do criador
}
```

### Prompt Template

```
Voce e um assistente criativo para criadores de conteudo na plataforma FanDreams.
Analise a imagem enviada e gere:

1. Tres opcoes de legenda (casual, formal e provocativa) em portugues brasileiro.
   Cada legenda deve ter no maximo 200 caracteres.
   Use emojis de forma moderada.

2. Cinco hashtags relevantes para descoberta na plataforma.

3. Baseado no contexto do criador, sugira o melhor horario para postar.

Contexto do criador:
- Categoria: {category}
- Numero de seguidores: {followerCount}
- Horarios de pico de engajamento: {peakHours}

Responda em JSON valido.
```

### Rate Limit por Tier
- Bronze: 3 usos/dia
- Silver: 5 usos/dia
- Gold: 10 usos/dia
- Diamond: 20 usos/dia
- Obsidian: Ilimitado

### Cache Strategy
- Cache por hash da imagem (SHA-256) + tone + language
- TTL: 24 horas
- Imagens similares nao compartilham cache (cada imagem e unica)

### Frontend Integration

```tsx
// apps/web/src/app/(platform)/creator/content/page.tsx
// Adicionar botao "Sugerir legenda" no form de criacao de post
// O botao so aparece quando ha pelo menos uma imagem no mediaFiles

<Button
  type="button"
  variant="ghost"
  size="sm"
  onClick={handleDreamCaption}
  disabled={captionLoading || mediaFiles.length === 0}
>
  <Sparkles className="w-4 h-4 mr-1" />
  Sugerir legenda
</Button>
```

### Database Schema (Novo)

```sql
-- Tracking de uso de AI features
CREATE TABLE ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  feature VARCHAR(50) NOT NULL, -- 'dream_caption', 'fan_bot', etc.
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  model VARCHAR(50) NOT NULL, -- 'gemini-2.0-flash', etc.
  cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
  cached BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_feature ON ai_usage(feature);
CREATE INDEX idx_ai_usage_date ON ai_usage(created_at);
```

### Estimativa de Tokens
- Input: ~1.500 tokens (imagem ~1.200 + prompt ~300)
- Output: ~200 tokens
- Custo por chamada: ~$0.001 (Gemini Flash)

---

## Feature 2: FanBot

### Descricao
Assistente de sugestao de respostas para DMs. Criador ve a sugestao e pode enviar, editar ou ignorar.

### Prioridade: ALTA
### Complexidade: MEDIA
### Custo: ~$100/mes (10k usuarios)

### Fluxo
1. Criador recebe DM de fa
2. Ao lado do campo de resposta, icone de "sugerir resposta"
3. IA analisa: ultima mensagem do fa + tom historico do criador + tier do fa
4. Sugere 2 opcoes de resposta
5. Criador clica para inserir no campo, edita se quiser, e envia manualmente

### API Endpoint

```
POST /api/v1/ai/fan-bot/suggest
Authorization: Bearer <token>

Body:
{
  "conversationId": "uuid",
  "lastMessage": "Texto da ultima mensagem do fa",
  "fanDisplayName": "Nome do fa",
  "fanTier": "gold",
  "isSubscriber": true
}

Response:
{
  "suggestions": [
    { "text": "Sugestao de resposta 1", "tone": "friendly" },
    { "text": "Sugestao de resposta 2", "tone": "professional" }
  ]
}
```

### Prompt Template

```
Voce e um assistente de respostas para criadores de conteudo.
Gere 2 sugestoes de resposta em portugues brasileiro.

Mensagem recebida de "{fanDisplayName}" ({fanTier}, assinante: {isSubscriber}):
"{lastMessage}"

Diretrizes:
- Tom amigavel e pessoal
- Maximo 150 caracteres por sugestao
- Primeira sugestao: casual e calorosa
- Segunda sugestao: profissional e agradecida
- Se o fa for assinante, demonstre mais apreciacao
- NUNCA prometa nada (encontros, conteudo exclusivo nao planejado, etc.)
- Mantenha limites profissionais

Responda em JSON com array "suggestions".
```

### Seguranca
- NUNCA enviar automaticamente - sempre requer acao do criador
- Nao armazenar conteudo das mensagens no cache de AI
- Rate limit: 50 sugestoes/dia por criador
- Apenas criadores verificados (KYC approved) podem usar

### Riscos e Mitigacoes
| Risco | Mitigacao |
|-------|----------|
| Respostas inapropriadas | Filtro de conteudo no output + nunca auto-envia |
| Fa perceber que e IA | Tom personalizado + criador sempre edita |
| Custo alto com criadores populares | Rate limit por dia + cache por padrao de mensagem |
| Privacidade | Nao armazenar conteudo de mensagens, apenas tokens de uso |

---

## Feature 3: DreamMod

### Descricao
Moderacao de conteudo inteligente usando LLM multimodal. Complementa ou substitui SightEngine.

### Prioridade: MEDIA
### Complexidade: MEDIA
### Custo: ~$200/mes (10k usuarios)

### Fluxo
1. Upload de midia (post, avatar, mensagem)
2. Pipeline de moderacao:
   a. Analise rapida via regras locais (tamanho, formato)
   b. Analise de imagem via Gemini Flash (classificacao NSFW, violencia, etc.)
   c. Se borderline, encaminha para revisao humana
3. Resultado armazenado no campo moderation_status do post/media

### Categorias de Classificacao

```json
{
  "safe": true,           // Conteudo seguro para todos
  "adult": false,         // Conteudo adulto explicito
  "suggestive": false,    // Conteudo sugestivo
  "violence": false,      // Violencia
  "hate_speech": false,   // Discurso de odio
  "spam": false,          // Spam ou conteudo repetitivo
  "scam": false,          // Tentativa de golpe
  "underage": false,      // Possivel menor de idade
  "confidence": 0.95      // Confianca da classificacao
}
```

### Prompt Template

```
Analise esta imagem e classifique nas seguintes categorias.
Responda APENAS com JSON valido.

Categorias:
- safe: boolean (conteudo seguro)
- adult: boolean (nudez explicita, atos sexuais)
- suggestive: boolean (roupas reveladoras, poses sugestivas)
- violence: boolean (violencia fisica, sangue)
- hate_speech: boolean (simbolos de odio, texto ofensivo)
- spam: boolean (texto repetitivo, propaganda)
- scam: boolean (links suspeitos, pedidos de dinheiro)
- underage: boolean (pessoa aparentando menos de 18 anos)
- confidence: number 0-1 (confianca geral da analise)
- reason: string (motivo principal da classificacao, max 100 chars)

IMPORTANTE:
- Se confidence < 0.7, marque para revisao humana
- Priorize seguranca: na duvida, classifique como inseguro
```

### Vantagem sobre SightEngine
- Entende contexto (memes, screenshots com texto)
- Detecta golpes em imagens de texto
- Mais nuance entre "adult" e "suggestive"
- Custo potencialmente menor a longo prazo

---

## Feature 4: CreatorCoach

### Descricao
Relatorio semanal automatico com insights de performance e sugestoes actionaveis.

### Prioridade: MEDIA
### Complexidade: MEDIA
### Custo: ~$200/mes (10k usuarios)

### Fluxo
1. Cron job semanal (domingo 03:00 UTC)
2. Para cada criador ativo:
   a. Coleta metricas da semana (posts, likes, comments, tips, novos assinantes)
   b. Compara com semana anterior
   c. Envia metricas para LLM com prompt de analise
   d. Armazena relatorio gerado
3. Criador acessa relatorio no dashboard

### API Endpoint

```
GET /api/v1/ai/creator-coach/report
Authorization: Bearer <token>

Response:
{
  "weekOf": "2026-02-16",
  "summary": "Resumo da semana em 2-3 frases",
  "highlights": [
    { "metric": "engajamento", "value": "+23%", "insight": "Posts com imagens tiveram 3x mais curtidas" },
    { "metric": "assinantes", "value": "+12", "insight": "Maior crescimento desde janeiro" }
  ],
  "suggestions": [
    "Poste entre 19h-21h para maximizar engajamento",
    "Considere criar um tier intermediario - 40% dos seus fas visualizam mas nao assinam",
    "Seus posts com hashtags tem 2x mais alcance"
  ],
  "creatorScore": {
    "current": 72,
    "change": +3,
    "weakestArea": "responsiveness",
    "tip": "Responda DMs em ate 4h para melhorar seu Creator Score"
  }
}
```

### Prompt Template

```
Voce e um consultor de performance para criadores de conteudo na plataforma FanDreams.
Analise as metricas abaixo e gere um relatorio semanal conciso e motivador em portugues brasileiro.

Metricas desta semana:
- Posts publicados: {postsThisWeek} (semana anterior: {postsPrevWeek})
- Curtidas totais: {likesThisWeek} (anterior: {likesPrevWeek})
- Comentarios: {commentsThisWeek} (anterior: {commentsPrevWeek})
- Tips recebidos: {tipsThisWeek} FC (anterior: {tipsPrevWeek})
- Novos assinantes: {newSubsThisWeek} (anterior: {newSubsPrevWeek})
- Cancelamentos: {churnsThisWeek}
- Taxa de resposta a DMs: {responseRate}%
- Tempo medio de resposta: {avgResponseTime} horas
- Creator Score: {creatorScore}/100
- Horarios de pico: {peakHours}

Gere:
1. Um resumo motivador de 2-3 frases
2. 2-3 highlights com insights especificos
3. 3 sugestoes actionaveis e especificas
4. Dica para melhorar o Creator Score

Responda em JSON valido.
```

### Batch Processing
- Processamento em lote: 100 criadores por batch
- Intervalo entre batches: 5 segundos (rate limit)
- Prioridade: criadores com mais assinantes primeiro
- Fallback: se LLM falhar, gera relatorio basico com templates

---

## Feature 5: PitchWriter

### Descricao
Assistente para criacao de campanhas de crowdfunding no FanDreamsPitch.

### Prioridade: MEDIA
### Complexidade: BAIXA
### Custo: ~$15/mes (10k usuarios)

### Fluxo
1. Criador inicia criacao de campanha
2. Preenche titulo e descricao basica
3. Clica "Melhorar com IA"
4. IA gera: descricao completa, metas sugeridas, tiers de recompensa
5. Criador edita e salva

### API Endpoint

```
POST /api/v1/ai/pitch-writer/improve
Authorization: Bearer <token>

Body:
{
  "title": "Titulo da campanha",
  "briefDescription": "Descricao curta do criador",
  "category": "cosplay",
  "targetAudience": "fas de anime",
  "followerCount": 1500,
  "avgTipAmount": 50
}

Response:
{
  "improvedDescription": "Descricao completa e persuasiva da campanha...",
  "suggestedGoal": 50000, // FanCoins
  "rewardTiers": [
    { "name": "Apoiador", "minAmount": 100, "description": "Agradecimento publico + badge exclusivo" },
    { "name": "Fa Dedicado", "minAmount": 500, "description": "Conteudo exclusivo dos bastidores + badge" },
    { "name": "Super Fa", "minAmount": 2000, "description": "Mensagem personalizada + conteudo exclusivo + badge" }
  ]
}
```

---

## Feature 6: SmartFeed

### Descricao
Resumos diarios personalizados e busca semantica de conteudo.

### Prioridade: MEDIA
### Complexidade: ALTA
### Custo: ~$600/mes (10k usuarios) - mitigado com embeddings gratuitos

### Componentes

#### 6.1 Post Embeddings (custo zero)
- Gerar embedding de cada post no momento do upload
- Usar Gemini Embedding API (gratis para <1M tokens/dia)
- Armazenar embeddings no PostgreSQL via pgvector
- Habilitar busca semantica

```sql
-- Extensao pgvector no Neon PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE posts ADD COLUMN embedding vector(768);
CREATE INDEX ON posts USING ivfflat (embedding vector_cosine_ops);
```

#### 6.2 Resumo Diario
- Batch processing diario (06:00 UTC)
- Para cada fa com 3+ assinaturas:
  - Coleta posts do dia dos criadores assinados
  - LLM gera resumo de 3-5 highlights
  - Armazena em cache com TTL 24h

#### 6.3 Busca Semantica

```
GET /api/v1/ai/search?q=cosplay+de+anime

Response:
{
  "results": [
    { "postId": "uuid", "score": 0.92, "reason": "Post de cosplay de Naruto por @criador1" },
    { "postId": "uuid", "score": 0.87, "reason": "Fotos de cosplay de One Piece por @criador2" }
  ]
}
```

---

## Feature 7: GuildBattle AI

### Descricao
Narrador dramatico de batalhas entre guilds para aumentar engajamento.

### Prioridade: BAIXA
### Complexidade: BAIXA
### Custo: ~$10/mes

### Fluxo
1. Batalha de guild esta ativa
2. A cada milestone (25%, 50%, 75%, final), IA gera narracao
3. Narracao e exibida no chat da batalha e nas notificacoes

### Prompt Template

```
Voce e um narrador esportivo eletrizante.
Narre o momento atual de uma batalha entre guilds no FanDreams.

Situacao:
- Guild 1: "{guild1Name}" - {guild1Score} FanCoins arrecadados ({guild1Members} membros)
- Guild 2: "{guild2Name}" - {guild2Score} FanCoins arrecadados ({guild2Members} membros)
- Tempo restante: {timeRemaining}
- Diferenca: {scoreDiff} FanCoins
- Fase: {phase} (inicio/meio/final/resultado)

Gere uma narracao dramatica de 2-3 frases em portugues brasileiro.
Use metaforas esportivas. Seja empolgante e parcial para o que esta perdendo (para gerar engajamento).
Maximo 200 caracteres.
```

---

## Feature 8: DreamTranslate

### Descricao
Traducao automatica de posts e comentarios sob demanda.

### Prioridade: BAIXA
### Complexidade: BAIXA
### Custo: ~$30/mes

### Fluxo
1. Fa ve post em idioma diferente
2. Clica "Traduzir"
3. Verifica cache (mesmo post + idioma destino)
4. Se nao existe, chama LLM para traduzir
5. Armazena traducao no cache (TTL: 30 dias)

### Cache Strategy
- Key: `translate:{postId}:{targetLang}`
- TTL: 30 dias
- Uma traducao servida para todos os usuarios do mesmo idioma
- Custo real: apenas a primeira chamada por post+idioma

---

## Controle de Custos

### Budget System

```typescript
// apps/api/src/services/ai/ai-budget.ts

interface FeatureBudget {
  feature: string
  dailyLimitUsd: number
  currentSpendUsd: number
  enabled: boolean
}

// Limites diarios por feature
const DAILY_BUDGETS: Record<string, number> = {
  dream_caption: 5.00,
  fan_bot: 10.00,
  dream_mod: 15.00,
  creator_coach: 10.00, // concentrado no dia do batch
  pitch_writer: 2.00,
  smart_feed: 25.00,
  guild_battle: 1.00,
  dream_translate: 3.00,
}

// Se budget diario excedido:
// 1. Feature desabilitada para novos requests
// 2. Alerta enviado para admin
// 3. Requests em andamento completam normalmente
// 4. Budget reseta a meia-noite UTC
```

### Rate Limiting por Tier de Gamificacao

| Feature | Bronze | Silver | Gold | Diamond | Obsidian |
|---------|--------|--------|------|---------|----------|
| DreamCaption | 3/dia | 5/dia | 10/dia | 20/dia | Ilimitado |
| FanBot | - | 10/dia | 30/dia | 50/dia | Ilimitado |
| CreatorCoach | Basico | Basico | Completo | Completo | Completo |
| PitchWriter | 1/campanha | 2/campanha | 3/campanha | 5/campanha | Ilimitado |
| SmartFeed | 1 resumo | 1 resumo | 3 resumos | 5 resumos | Ilimitado |
| DreamTranslate | 5/dia | 10/dia | 20/dia | 50/dia | Ilimitado |

### Monetizacao via FanCoins

| Feature | Usos gratuitos | Preco por uso extra |
|---------|---------------|---------------------|
| DreamCaption | 3/dia | 10 FanCoins |
| FanBot | 10/dia (Gold+) | N/A (feature premium) |
| PitchWriter | 1/campanha | 50 FanCoins |
| SmartFeed resumo | 1/dia | 5 FanCoins |
| DreamTranslate | 5/dia | 2 FanCoins |

---

## Cronograma de Implementacao Sugerido

### Fase 1 - MVP (Semana 1-2)
- [ ] Criar camada de servico AI (router, cache, budget)
- [ ] Implementar DreamCaption (feature mais simples e isolada)
- [ ] Adicionar tabela ai_usage no banco
- [ ] Integrar botao no form de criacao de post
- [ ] Testes com Gemini Flash API

### Fase 2 - Comunicacao (Semana 3-4)
- [ ] Implementar FanBot
- [ ] Integrar sugestoes na tela de mensagens
- [ ] Implementar DreamTranslate
- [ ] Adicionar rate limiting por tier

### Fase 3 - Analytics (Semana 5-6)
- [ ] Implementar CreatorCoach
- [ ] Criar dashboard de relatorios semanais
- [ ] Implementar PitchWriter
- [ ] Integrar no fluxo de criacao de campanha

### Fase 4 - Discovery (Semana 7-8)
- [ ] Configurar pgvector no Neon PostgreSQL
- [ ] Implementar gerador de embeddings para posts
- [ ] Criar busca semantica
- [ ] Implementar resumo diario do SmartFeed

### Fase 5 - Gamificacao (Semana 9-10)
- [ ] Implementar GuildBattle AI
- [ ] Implementar DreamMod (complementar SightEngine)
- [ ] Dashboard admin de custos e uso de AI
- [ ] Ajuste fino de budgets baseado em uso real

---

## Requisitos de Ambiente

### Desenvolvimento
- Chaves de API em modo sandbox/teste
- Budget diario reduzido ($5/dia total)
- Logs verbosos de todas as chamadas
- Feature flags para habilitar/desabilitar cada recurso

### Producao
- Chaves de API de producao
- Monitoramento de custos em tempo real via Sentry
- Alertas automaticos quando budget atinge 80%
- Kill switch global e por feature
- Fallback graceful quando AI indisponivel

---

## Metricas de Sucesso

| Metrica | Meta | Como medir |
|---------|------|-----------|
| Adocao DreamCaption | 30% dos posts usam | ai_usage WHERE feature = 'dream_caption' |
| Taxa de resposta (FanBot) | +20% | Creator Score: responsiveness |
| Tempo de criacao de post | -40% | Tempo entre abrir form e publicar |
| Sucesso de campanhas Pitch | +25% | Campanhas funded / total |
| Engajamento em batalhas | +50% | Tips durante batalhas |
| Busca semantica | 10% dos usuarios/dia | Logs de /ai/search |
| Custo por usuario | < $0.07/mes | ai_usage.cost_usd / active_users |

---

## Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|----------|
| Custo excede orcamento | Media | Alto | Budget system + kill switch |
| API provider indisponivel | Baixa | Alto | Multi-provider fallback |
| Conteudo gerado inapropriado | Media | Alto | Filtro de output + nunca auto-publica |
| Usuarios abusam do recurso | Media | Medio | Rate limiting + FanCoins por uso |
| Latencia alta na resposta | Media | Medio | Cache + streaming responses |
| Dados senssiveis enviados para LLM | Baixa | Alto | Sanitizar input, nao enviar PII |

---

## Notas Finais

- Todas as features de IA devem ser **opcionais** e **nao-bloqueantes**
- Se a IA falhar, o fluxo normal da plataforma continua sem interrupcao
- Nenhum conteudo deve ser publicado automaticamente pela IA - sempre requer acao do usuario
- Logs de uso devem ser mantidos para auditoria e otimizacao de custos
- Revisao mensal de custos vs. valor gerado para decidir expansao ou corte

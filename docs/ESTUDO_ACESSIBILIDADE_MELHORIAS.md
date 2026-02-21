# Estudo de Impacto — Melhorias de Acessibilidade FanDreams

> **Data:** Fevereiro de 2026
> **Versao:** 1.0
> **Referencia:** Politica de Acessibilidade FanDreams v1.0
> **Status:** Planejamento

---

## 1. Estado Atual da Plataforma

### 1.1 Stack Tecnica

| Aspecto | Tecnologia |
|---|---|
| Framework Frontend | Next.js 15 (App Router) + React 19 |
| Estilizacao | Tailwind CSS 4 + PostCSS |
| Animacoes | Framer Motion v11 |
| Backend | Hono 4 (Node.js/TypeScript) |
| Banco de Dados | Drizzle ORM + Neon PostgreSQL |
| Video Streaming | HLS.js + Bunny CDN |
| Estado | Zustand (auth, theme, UI) |
| Forms | React Hook Form + Zod |
| Componentes | Custom (sem biblioteca externa) |
| Deploy | Vercel (web) + Railway (API) |

### 1.2 Diagnostico de Acessibilidade Atual

| Categoria | Estado | Detalhes |
|---|---|---|
| Atributos ARIA | Minimo | Apenas `role="switch"` e `aria-checked` em 2 arquivos |
| HTML Semantico | Bom | `<main>`, `<header>`, `<nav>`, `<aside>` presentes em 26 arquivos |
| Alt text em imagens | Irregular | 46 arquivos com imagens; maioria com `alt=""` vazio |
| Skip links | Inexistente | Nenhuma implementacao |
| Navegacao por teclado | Limitada | Apenas 3 arquivos com `onKeyDown` (OTP, tags, comentarios) |
| Focus management | Parcial | `focus-visible` em buttons; `focus:` em inputs |
| prefers-reduced-motion | Nao implementado | 6+ animacoes ativas sem respeitar preferencia do sistema |
| Contraste de cores | Nao auditado | Cores definidas, mas sem verificacao formal de ratios |
| Testes de acessibilidade | Zero | Nenhum axe-core, jest-axe ou Lighthouse CI |
| Player de video | Basico | HLS.js + `<video controls>` nativo, sem legendas/ARIA |
| Erros em formularios | Visual apenas | Sem `aria-invalid`, `aria-describedby` ou `aria-live` |
| Pagina /acessibilidade | Placeholder | Rota existe, conteudo ainda nao publicado |
| Preferencias de usuario | Inexistente | Sem painel de configuracoes de acessibilidade |

### 1.3 Arquivos-Chave Identificados

| Componente | Caminho |
|---|---|
| Input | `apps/web/src/components/ui/input.tsx` |
| Button | `apps/web/src/components/ui/button.tsx` |
| Avatar | `apps/web/src/components/ui/avatar.tsx` |
| Video Player | `apps/web/src/components/ui/video-player.tsx` |
| Header | `apps/web/src/components/layout/header.tsx` |
| Sidebar | `apps/web/src/components/layout/sidebar.tsx` |
| Bottom Nav | `apps/web/src/components/layout/bottom-nav.tsx` |
| Platform Layout | `apps/web/src/app/(platform)/layout.tsx` |
| Home Page | `apps/web/src/app/page.tsx` |
| Login | `apps/web/src/app/login/page.tsx` |
| Register | `apps/web/src/app/register/page.tsx` |
| Settings | `apps/web/src/app/(platform)/settings/page.tsx` |
| Post Card | `apps/web/src/components/feed/post-card.tsx` |
| Contact Modal | `apps/web/src/components/contact-modal.tsx` |
| Subscribe Drawer | `apps/web/src/components/subscription/subscribe-drawer.tsx` |
| Creator Content | `apps/web/src/app/(platform)/creator/content/page.tsx` |
| Legal Page | `apps/web/src/components/legal-page.tsx` |
| CSS Global | `apps/web/src/app/globals.css` |
| Store (Zustand) | `apps/web/src/lib/store.ts` |

---

## 2. Analise de Impacto por Secao da Politica

### 2.1 Perceptivel (WCAG 3.1)

#### 2.1.1 Textos Alternativos para Imagens

- **Dificuldade:** Baixa
- **Impacto a11y:** Alto
- **Risco UX:** Zero
- **Escopo:** ~46 arquivos com imagens
- **Estado atual:** Maioria usa `alt=""` vazio
- **Acao necessaria:** Auditar cada `<Image>` e preencher alt descritivo. Imagens decorativas mantém `alt=""` (correto por WCAG). Imagens funcionais (avatares, capas, thumbnails de posts) precisam de alt dinâmico baseado no conteudo
- **Arquivos prioritarios:**
  - `post-card.tsx` (linhas 598, 628, 658, 728) — 4 imagens com alt vazio
  - `profile-swipe-card.tsx` (linha 41) — alt vazio
  - `post-viewer.tsx` (linhas 150, 176) — alt vazio
  - `page.tsx` home (linhas 178, 698) — alt vazio
  - `settings/page.tsx` (linha 224) — cover image sem alt

#### 2.1.2 Contraste de Cores (minimo 4.5:1 texto normal, 3:1 texto grande)

- **Dificuldade:** Media
- **Impacto a11y:** Alto
- **Risco UX:** Baixo a medio
- **Estado atual:** Cores definidas em CSS vars mas sem auditoria formal de ratios
- **Combinacoes a verificar:**
  - `--color-muted` (#8B8B8B) sobre `--color-background` (#0F0F0F) — estimado ~6.2:1 (provavelmente OK)
  - `--color-primary` (#7C3AED) sobre `--color-surface` (#1A1A2E) — precisa validar
  - Textos sobre gradientes e overlays — verificacao individual necessaria
  - Badges e status indicators — verificar contraste
- **Risco UX detalhado:** Ajustar contrastes pode alterar a estetica "premium dark". Mitigacao: ajustes de 1-2 tons, imperceptiveis para maioria dos usuarios. Modo alto contraste absorve casos extremos
- **Ferramenta recomendada:** Lighthouse CI + plugin de contraste no pipeline

#### 2.1.3 Modo Alto Contraste

- **Dificuldade:** Media-alta
- **Impacto a11y:** Alto
- **Risco UX:** Zero (opt-in)
- **Estado atual:** Existe toggle dark/light via Zustand. Nenhum modo alto contraste
- **Acao necessaria:**
  - Criar tema CSS "alto contraste" com cores solidas, bordas mais visiveis, sem transparencias
  - Adicionar classe `html.high-contrast` similar ao existente `html.light`
  - Estender `ThemeStore` no Zustand para suportar o novo modo
  - Persistir preferencia em localStorage e/ou banco de dados
- **Escopo:** ~1 novo arquivo CSS theme + alteracoes em `globals.css` + `store.ts`

#### 2.1.4 Controles de Tamanho de Fonte

- **Dificuldade:** Media
- **Impacto a11y:** Alto
- **Risco UX:** Zero (opt-in)
- **Acao necessaria:**
  - Criar controle de escala de fonte (ex: 100%, 125%, 150%, 200%)
  - Aplicar via CSS var `--font-scale` no `<html>` e multiplicar base rem
  - Persistir preferencia
- **Dependencia:** Auditar que todos os containers usam unidades relativas (rem/em) e nao px fixos

#### 2.1.5 Texto Redimensionavel ate 200%

- **Dificuldade:** Media
- **Impacto a11y:** Alto
- **Risco UX:** Baixo
- **Estado atual:** Tailwind usa `rem` por padrao (positivo). Possivel existencia de dimensoes fixas em containers
- **Acao necessaria:** Testar toda a plataforma a 200% zoom no browser. Corrigir overflows e truncamentos em containers com largura/altura fixa
- **Nota:** Layouts flexiveis do Tailwind ja sao naturalmente compatriveis com zoom

#### 2.1.6 Estrutura Semantica com Cabecalhos Hierarquicos

- **Dificuldade:** Baixa-media
- **Impacto a11y:** Alto
- **Risco UX:** Zero
- **Acao necessaria:** Auditar hierarquia de headings (h1-h6) em todas as paginas. Garantir que cada pagina tem um unico `<h1>` e headings sequenciais

#### 2.1.7 Conteudo Nao Dependente de Cor

- **Dificuldade:** Baixa
- **Impacto a11y:** Medio
- **Risco UX:** Zero
- **Acao necessaria:** Auditar status indicators, badges, alertas. Garantir que informacao por cor seja acompanhada de icone/texto. Ex: erro nao deve ser indicado apenas por cor vermelha

---

### 2.2 Operavel (WCAG 3.2)

#### 2.2.1 Navegacao Completa por Teclado

- **Dificuldade:** **Alta** (maior esforco do documento)
- **Impacto a11y:** Muito alto
- **Risco UX:** Zero (nao afeta mouse/touch)
- **Estado atual:** Apenas 3 arquivos com `onKeyDown` — OTP input, tag input e comentarios
- **Acao necessaria:**
  - Auditar TODOS os elementos interativos no codebase
  - Elementos `<div onClick>` precisam de `tabIndex={0}`, `role="button"`, handlers de `Enter`/`Space`
  - Implementar navegacao por setas em listas/grids (feed cards, discover cards)
  - Garantir que `Escape` fecha modais/drawers/overlays
  - Suportar `Tab`/`Shift+Tab` em sequencia logica
- **Areas criticas:**
  - Feed cards (`post-card.tsx`) — cards clicaveis sem keyboard support
  - Subscription drawers (`subscribe-drawer.tsx`) — sem focus trap
  - Contact modal (`contact-modal.tsx`) — sem focus trap
  - Settings toggles (`settings/page.tsx`) — switches sem keyboard Enter/Space
  - Sidebar navigation (`sidebar.tsx`) — hover-expand sem keyboard equivalent
  - Discover/swipe cards (`profile-swipe-card.tsx`) — interacao de swipe sem alternativa keyboard

#### 2.2.2 Sem Armadilhas de Teclado (Keyboard Traps)

- **Dificuldade:** Media
- **Impacto a11y:** Critico
- **Risco UX:** Zero
- **Acao necessaria:**
  - Implementar focus trap em modais e drawers (foco circula dentro do modal enquanto aberto)
  - Garantir que `Escape` sempre fecha overlays e retorna foco ao elemento que abriu
  - Testar que nenhum componente "prende" o foco sem saida
- **Solucao sugerida:** Usar biblioteca como `focus-trap-react` ou implementar hook `useFocusTrap`

#### 2.2.3 Skip-Navigation

- **Dificuldade:** **Muito baixa**
- **Impacto a11y:** Alto
- **Risco UX:** Zero (invisivel ate receber foco via Tab)
- **Acao necessaria:**
  - Adicionar `<a href="#main-content" class="sr-only focus:not-sr-only ...">Pular para conteudo principal</a>` no layout principal
  - Adicionar `id="main-content"` no `<main>`
  - CSS: visualmente oculto (`sr-only`) ate receber `:focus`
- **Escopo:** 1 arquivo — layout principal da plataforma

#### 2.2.4 Foco Visivel em Todos os Elementos

- **Dificuldade:** Baixa-media
- **Impacto a11y:** Alto
- **Risco UX:** Positivo (melhora UX removendo anel de foco no clique de mouse)
- **Estado atual:**
  - `Button` (`button.tsx` linha 35): usa `focus-visible:ring-2` (correto)
  - `Input` (`input.tsx`): usa `focus:ring-2` (aparece no clique — deveria ser `focus-visible`)
  - Demais componentes interativos: sem estilo de foco padronizado
- **Acao necessaria:**
  - Migrar `focus:` para `focus-visible:` em TODOS os inputs e elementos interativos
  - Padronizar outline de alto contraste
  - Criar classe utilitaria global para focus ring consistente

#### 2.2.5 Sem Flashes > 3/segundo

- **Dificuldade:** Baixa
- **Impacto a11y:** Critico (risco de convulsao)
- **Risco UX:** Zero
- **Estado atual:** Animacoes existentes (shimmer, pulse-glow, marquee, hero-gradient) nao parecem ultrapassar 3 flashes/segundo
- **Acao necessaria:** Auditoria visual de todas as animacoes definidas em `globals.css`. Documentar que estao dentro do limite

#### 2.2.6 Navegacao Consistente e Previsivel

- **Dificuldade:** Baixa
- **Impacto a11y:** Medio
- **Risco UX:** Zero
- **Estado atual:** Header fixo + sidebar + bottom nav — consistente entre paginas
- **Acao necessaria:** Verificar que componentes de navegacao nao mudam de posicao/ordem entre paginas. Ja parece OK pela arquitetura de layout

#### 2.2.7 Breadcrumbs

- **Dificuldade:** Media
- **Impacto a11y:** Medio
- **Risco UX:** Positivo (melhora orientacao para todos)
- **Estado atual:** Nao implementado
- **Acao necessaria:** Criar componente `Breadcrumb` com `<nav aria-label="Breadcrumb">` e `<ol>`. Implementar em paginas com profundidade (settings, creator content, perfil)

---

### 2.3 Compreensivel (WCAG 3.3)

#### 2.3.1 Idioma Declarado no HTML

- **Dificuldade:** **Muito baixa**
- **Impacto a11y:** Medio (leitores de tela usam para pronuncia)
- **Risco UX:** Zero
- **Acao necessaria:** Verificar/adicionar `lang="pt-BR"` no `<html>` do layout root. Se houver conteudo em outros idiomas, adicionar `lang` inline nos elementos

#### 2.3.2 Rotulos e Mensagens de Erro em Formularios

- **Dificuldade:** Media
- **Impacto a11y:** Alto
- **Risco UX:** Positivo (melhora UX para todos)
- **Estado atual:**
  - `Input` tem `<label htmlFor>` (bom)
  - Erros exibidos visualmente mas sem vinculacao semantica
- **Acao necessaria no componente Input:**
  ```
  - Adicionar aria-invalid={!!error}
  - Gerar id unico para mensagem de erro
  - Adicionar aria-describedby apontando para o id do erro
  - Adicionar aria-live="polite" no container de erro
  ```
- **Acao necessaria no Sonner (toasts):**
  - Verificar se toasts anunciam via `aria-live`. Sonner ja suporta nativamente (verificar configuracao)

#### 2.3.3 Prevencao de Erros em Transacoes Financeiras

- **Dificuldade:** Media
- **Impacto a11y:** Alto
- **Risco UX:** Minimo (passo de confirmacao aumenta confianca)
- **Acao necessaria:**
  - Verificar subscribe drawer — garantir dialogo de confirmacao antes de cobranca
  - Fluxos de saque — confirmacao explicita com resumo dos dados
  - Permitir revisao e correcao de dados antes de submissao

---

### 2.4 Robusto (WCAG 3.4)

#### 2.4.1 Atributos ARIA para Componentes Dinamicos

- **Dificuldade:** **Alta**
- **Impacto a11y:** Muito alto
- **Risco UX:** Zero (ARIA e invisivel para quem nao usa tecnologia assistiva)
- **Estado atual:** Apenas 2 instancias de `role="switch"` + `aria-checked`
- **Mapeamento de componentes que precisam de ARIA:**

| Componente | ARIA Necessario |
|---|---|
| Modais (contact-modal, etc) | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| Drawers (subscribe-drawer) | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| Sidebar expansivel | `aria-expanded`, `aria-label="Navegacao principal"` |
| Dropdown menus | `aria-expanded`, `aria-haspopup="menu"` |
| Botoes com icone | `aria-label` descritivo |
| Search input | `role="search"`, `aria-label` |
| Notificacoes/Toasts | `aria-live="polite"` ou `role="alert"` |
| Tabs (se existirem) | `role="tablist"`, `role="tab"`, `role="tabpanel"` |
| Loading states | `aria-busy="true"`, `aria-live="polite"` |
| Badge counters | `aria-label` com valor (ex: "3 mensagens nao lidas") |
| Theme toggle | `aria-label="Alternar tema"`, `aria-pressed` |
| Toggle switches | `role="switch"`, `aria-checked` (ja implementado) |

- **Escopo estimado:** ~15-20 componentes

#### 2.4.2 Landmarks ARIA

- **Dificuldade:** Baixa
- **Impacto a11y:** Alto
- **Risco UX:** Zero
- **Estado atual:** Tags semanticas existem (`<header>`, `<nav>`, `<main>`, `<aside>`) mas sem `aria-label` para diferenciar multiplas regioes do mesmo tipo
- **Acao necessaria:**
  - `<header>` — adicionar `role="banner"` (implicito, mas explicitar ajuda)
  - `<nav>` sidebar — adicionar `aria-label="Navegacao principal"`
  - `<nav>` bottom — adicionar `aria-label="Navegacao mobile"`
  - `<main>` — adicionar `id="main-content"` (para skip link)
  - `<aside>` — adicionar `aria-label="Menu lateral"`

#### 2.4.3 Compatibilidade com Leitores de Tela

- **Dificuldade:** Alta (requer testes manuais)
- **Impacto a11y:** Muito alto
- **Risco UX:** Zero
- **Acao necessaria:** Apos implementar ARIA e semantica, testar com:
  - NVDA (Windows) — gratuito
  - VoiceOver (Mac/iOS) — nativo
  - TalkBack (Android) — nativo
- **Fluxos criticos para teste:** cadastro, login, navegacao principal, pagamento, saque, denuncia

---

## 3. Recursos Especificos da Plataforma

### 3.1 Painel de Preferencias de Acessibilidade

- **Dificuldade:** Media-alta
- **Impacto a11y:** Alto
- **Risco UX:** Zero (aditivo, opt-in)
- **Local:** "Minha Conta" > "Acessibilidade"
- **Funcionalidades a construir:**

| Preferencia | Implementacao |
|---|---|
| Alto contraste | Nova classe CSS `html.high-contrast` + toggle |
| Tamanho de fonte | CSS var `--font-scale` + slider (100%-200%) |
| Reducao de animacoes | `prefers-reduced-motion` + toggle manual |
| Modo leitor | Layout simplificado sem sidebar/distractoes |
| Desativar autoplay | Flag no player de video |

- **Dependencias:**
  - Estender `store.ts` (Zustand) com `AccessibilityStore`
  - Persistir preferencias em localStorage e sincronizar com API
  - Criar rota `/settings/accessibility` ou tab em settings

### 3.2 Player de Video Acessivel

- **Dificuldade:** **Alta**
- **Impacto a11y:** Muito alto
- **Risco UX:** Baixo (melhorias beneficiam todos)
- **Estado atual:** `video-player.tsx` com HLS.js + `<video controls>` nativo. Sem legendas, sem ARIA, sem keyboard shortcuts
- **Acao necessaria:**
  - Suporte a `<track kind="captions">` para legendas
  - Keyboard shortcuts: `Space` (play/pause), `M` (mute), `F` (fullscreen), setas (seek), `C` (captions)
  - ARIA labels nos controles customizados
  - Garantir nenhum autoplay com som (`muted` por padrao se autoplay)
  - Botao de pausa visivel e focavel
  - Controle de volume independente e acessivel
- **Nota sobre legendas:** Requer integracao backend para armazenar/servir arquivos `.vtt`

### 3.3 Ferramentas para Criadores

- **Dificuldade:** **Alta**
- **Impacto a11y:** Medio
- **Risco UX:** Baixo (campos opcionais, nao bloqueiam fluxo)
- **Funcionalidades a construir:**

| Ferramenta | Dificuldade | Detalhes |
|---|---|---|
| Campo alt text no upload de imagens | Baixa | Adicionar textarea no formulario de upload |
| Geracao automatica de legendas | **Muito alta** | Requer servico de transcricao ML (Whisper/similar) + infraestrutura |
| Verificador de contraste no editor | Media | Widget que analisa cores do perfil/banner do criador |
| Preview para leitor de tela | Media-alta | Simular output de leitor de tela para preview |
| Guia de boas praticas | Baixa | Conteudo estatico no centro de ajuda |

- **Nota:** A geracao automatica de legendas e o item de maior complexidade de toda a politica. Requer:
  - Servico de ML (Whisper API ou similar)
  - Pipeline de processamento de audio
  - Armazenamento de arquivos .vtt
  - Interface de revisao pelo Criador
  - Suporte a multiplos idiomas

---

## 4. Testes e Avaliacao

### 4.1 Testes Automatizados

- **Dificuldade:** Media
- **Impacto a11y:** Alto (prevencao de regressoes)
- **Risco UX:** Zero (infra de desenvolvimento)
- **Estado atual:** Zero testes de qualquer tipo no frontend
- **Acao necessaria:**

| Ferramenta | Proposito | Integracao |
|---|---|---|
| `axe-core` | Analise automatica de acessibilidade | Integrar no CI/CD |
| `@axe-core/react` | Auditoria em tempo de desenvolvimento | Overlay de dev |
| `jest-axe` ou `vitest-axe` | Testes unitarios de a11y | Test runner |
| Lighthouse CI | Metricas de acessibilidade por deploy | GitHub Actions |
| `eslint-plugin-jsx-a11y` | Lint de acessibilidade em JSX | ESLint config |

- **Nota sobre pipeline:**
  - Turbo ja orquestra build/lint/type-check
  - Adicionar task `test:a11y` no `turbo.json`
  - Integrar no CI do Vercel ou GitHub Actions

### 4.2 Testes Manuais

- **Dificuldade:** Alta (processo continuo)
- **Risco UX:** Zero
- **Checklist por release:**
  - [ ] Navegacao completa por teclado em fluxos criticos
  - [ ] Teste com NVDA ou VoiceOver
  - [ ] Verificacao de contraste em novos componentes
  - [ ] Zoom 200% sem quebra de layout
  - [ ] Teste de formularios com leitor de tela

### 4.3 Auditoria Externa

- **Dificuldade:** Alta (custo + coordenacao)
- **Risco UX:** Zero
- **Acao:** Contratar especialistas para auditoria WCAG 2.1 AA. Publicar VPAT/ACR em `/acessibilidade`

---

## 5. Avaliacao Global de Risco sobre a UX Atual

### 5.1 Conclusao: Risco MUITO BAIXO

| Categoria | % das Mudancas | Impacto Visual |
|---|---|---|
| Mudancas invisiveis (ARIA, alt, landmarks, lang, skip-links) | ~80% | Nenhum para usuarios sem tecnologia assistiva |
| Features aditivas opt-in (painel a11y, alto contraste, modo leitor) | ~15% | Visivel apenas para quem ativar |
| Alteracoes visuais (contraste, focus rings) | ~5% | Minimo — ajustes sutis de 1-2 tons |

### 5.2 Unico Ponto de Atencao

O ajuste de contraste de cores e o unico item com potencial de alterar a estetica visual:
- Se `--color-muted` ou cores de badges precisarem ser clareadas, pode haver mudanca sutil na estetica "premium dark"
- **Mitigacao:** Ajustes de 1-2 tons sao imperceptiveis para maioria dos usuarios. Modo alto contraste separado absorve casos extremos

### 5.3 Mudancas que MELHORAM a UX para Todos

Varios itens de acessibilidade beneficiam todos os usuarios:
- `focus:` para `focus-visible:` — remove anel de foco indesejado ao clicar com mouse
- Mensagens de erro vinculadas a campos — orientacao mais clara
- Breadcrumbs — melhor orientacao na navegacao
- Confirmacao em transacoes — aumenta confianca
- Keyboard shortcuts no video player — conveniencia para power users

---

## 6. Matriz de Priorizacao

### 6.1 Prioridade 1 — Quick Wins (Ganho Alto, Esforco Baixo)

| Item | Dificuldade | Impacto A11y | Risco UX | Sprint Est. |
|---|---|---|---|---|
| Skip-navigation link | Muito baixa | Alto | Zero | 0.5 |
| `lang="pt-BR"` no HTML | Muito baixa | Medio | Zero | 0.1 |
| Alt text em imagens funcionais | Baixa | Alto | Zero | 1 |
| `focus:` para `focus-visible:` | Baixa | Medio | Positivo | 0.5 |
| `aria-invalid` + `aria-describedby` em forms | Baixa | Alto | Positivo | 0.5 |
| Instalar `eslint-plugin-jsx-a11y` | Muito baixa | Medio (prevencao) | Zero | 0.1 |

**Subtotal estimado: ~1-2 sprints**

### 6.2 Prioridade 2 — Fundacao (Ganho Alto, Esforco Medio)

| Item | Dificuldade | Impacto A11y | Risco UX | Sprint Est. |
|---|---|---|---|---|
| ARIA labels em icones/botoes sem texto | Media | Alto | Zero | 1 |
| Landmarks com aria-label | Baixa | Alto | Zero | 0.5 |
| `prefers-reduced-motion` + toggle | Media | Alto | Zero | 1 |
| Focus trap em modais/drawers | Media | Alto | Zero | 1 |
| Auditoria de contraste de cores | Media | Alto | Baixo | 1 |
| axe-core + Lighthouse no CI/CD | Media | Alto (prevencao) | Zero | 1 |
| Hierarquia de headings | Baixa | Medio | Zero | 0.5 |
| `role="dialog"` em modais + `aria-expanded` no sidebar | Media | Alto | Zero | 1 |

**Subtotal estimado: ~2-3 sprints**

### 6.3 Prioridade 3 — Completude (Ganho Alto, Esforco Alto)

| Item | Dificuldade | Impacto A11y | Risco UX | Sprint Est. |
|---|---|---|---|---|
| Navegacao completa por teclado | Alta | Muito alto | Zero | 3-4 |
| ARIA em todos os componentes dinamicos | Alta | Muito alto | Zero | 2-3 |
| Painel de preferencias de acessibilidade | Media-alta | Alto | Zero | 2 |
| Player de video com keyboard + `<track>` | Alta | Muito alto | Baixo | 2-3 |
| Campo alt text no upload de imagens | Baixa | Medio | Zero | 0.5 |
| Breadcrumbs | Media | Medio | Positivo | 1 |

**Subtotal estimado: ~3-4 sprints**

### 6.4 Prioridade 4 — Avancado (Longo Prazo)

| Item | Dificuldade | Impacto A11y | Risco UX | Sprint Est. |
|---|---|---|---|---|
| Geracao automatica de legendas (ML) | Muito alta | Alto | Zero | 4-6 |
| Verificador de contraste para Criadores | Media | Medio | Zero | 1-2 |
| Preview para leitor de tela | Media-alta | Medio | Zero | 2-3 |
| Modo leitor (layout simplificado) | Media-alta | Medio | Zero | 2 |
| Testes manuais com leitores de tela | Alta (processo) | Alto | Zero | Continuo |
| Auditoria externa + VPAT/ACR | Alta (externo) | Alto | Zero | Externo |
| WCAG 2.2 progressive compliance | Alta | Medio | Zero | Continuo |

**Subtotal estimado: ongoing**

---

## 7. Roadmap Recomendado

```
Fase 1 — Quick Wins (~1-2 sprints)
├── Skip-navigation link
├── lang="pt-BR" no HTML root
├── Auditoria e preenchimento de alt text (46 arquivos)
├── Migracao focus: -> focus-visible: em inputs/componentes
├── aria-invalid + aria-describedby no componente Input
├── Instalar eslint-plugin-jsx-a11y
└── Atualizar pagina /acessibilidade com conteudo da politica

Fase 2 — Fundacao (~2-3 sprints)
├── ARIA labels em todos os botoes/icones sem texto visivel
├── Landmarks semanticos com aria-label
├── prefers-reduced-motion (media query + toggle)
├── Focus trap em modais e drawers
├── Auditoria formal de contraste de cores
├── axe-core + Lighthouse CI no pipeline
├── Correcao de hierarquia de headings
└── role="dialog", aria-expanded, aria-modal nos componentes

Fase 3 — Completude (~3-4 sprints)
├── Navegacao completa por teclado (todos os cards, menus, interacoes)
├── ARIA completo em todos os componentes dinamicos
├── Painel de preferencias de acessibilidade ("Minha Conta")
├── Player de video: keyboard shortcuts + suporte a <track>
├── Campo alt text no upload de imagens (criadores)
└── Componente de Breadcrumbs

Fase 4 — Avancado (ongoing)
├── Geracao automatica de legendas (integracao ML/Whisper)
├── Ferramentas completas para Criadores
├── Testes periodicos com leitores de tela
├── Modo leitor (layout simplificado)
├── Auditoria externa + publicacao VPAT/ACR
└── Conformidade progressiva WCAG 2.2
```

---

## 8. Dependencias Tecnicas

| Pacote/Ferramenta | Proposito | Fase |
|---|---|---|
| `eslint-plugin-jsx-a11y` | Lint de acessibilidade em JSX | 1 |
| `focus-trap-react` | Focus trap em modais/drawers | 2 |
| `axe-core` | Teste automatizado de a11y | 2 |
| `@axe-core/react` | Overlay de auditoria em dev | 2 |
| `vitest-axe` ou `jest-axe` | Testes unitarios de a11y | 2 |
| Lighthouse CI | Metricas por deploy | 2 |
| Whisper API (ou similar) | Transcricao automatica de audio | 4 |

---

## 9. Conclusao

A Politica de Acessibilidade da FanDreams e abrangente e bem estruturada. A analise do codebase atual revela que:

1. **A base semantica e razoavel** — HTML semantico ja esta presente, facilitando a evolucao
2. **O gap principal esta em ARIA e keyboard navigation** — os dois itens de maior esforco
3. **O risco de prejudicar a UX atual e muito baixo** (~80% das mudancas sao invisiveis para usuarios sem tecnologia assistiva)
4. **Varios itens melhoram a UX para todos** (focus-visible, breadcrumbs, confirmacoes, keyboard shortcuts)
5. **A geracao automatica de legendas e o item mais complexo** e deve ser tratado como projeto separado
6. **A ausencia total de testes** (nao apenas de a11y, mas de qualquer tipo no frontend) e um risco que deve ser endereçado nas primeiras fases

A implementacao pode ser feita de forma incremental sem interrupcoes no produto atual, seguindo o roadmap de 4 fases proposto.

---

*Documento gerado em Fevereiro de 2026*
*Baseado na analise do codebase FanDreams (commit atual)*
*Referencia: Politica de Acessibilidade FanDreams v1.0*

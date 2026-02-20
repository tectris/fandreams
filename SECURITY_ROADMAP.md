# FanDreams — Security & Content Protection Roadmap

## Status Geral

O FanDreams visa ser a plataforma mais avancada em protecao de conteudo e seguranca financeira entre todas as plataformas de criadores de conteudo.

---

## 1. Protecao de Conteudo (Media Security)

### Implementado (MVP)

| Feature | Status | Descricao |
|---------|--------|-----------|
| Signed URLs (Bunny Stream) | OK | URLs tokenizadas com SHA256 + expiracao de 1h para videos protegidos |
| Metadata stripping (EXIF) | OK | Remocao automatica de metadados EXIF/GPS de todas as imagens no upload |
| Image compression | OK | Pipeline Sharp com compressao otimizada (WebP/JPEG/PNG/AVIF) |
| HLS Streaming | OK | Videos servidos via HLS (playlist.m3u8 + segments .ts), nao como arquivo unico |
| Watermark visual (imagens) | OK | Marca d'agua diagonal tileada `fandreams.app/{username}` em todas as imagens de post |
| Esteganografia LSB (imagens) | OK | Fingerprint invisivel (userId + postId + timestamp + HMAC) embutido nos pixels |
| Content protection headers | OK | Cache-Control: no-store, X-Frame-Options: SAMEORIGIN em endpoints de video |

### Fase 2 — Curto Prazo

| Feature | Prioridade | Descricao |
|---------|-----------|-----------|
| DRM Bunny Stream (Widevine + FairPlay) | ALTA | Ativar DRM nativo do Bunny Stream para criptografia de video em tempo real. Widevine para Chrome/Android, FairPlay para Safari/iOS. Impede captura de stream via proxy. |
| Referrer restriction (Bunny CDN) | ALTA | Configurar no painel Bunny para aceitar requests apenas de `fandreams.app` e `api.fandreams.app`. |
| Watermark visual em videos | ALTA | Aplicar watermark `fandreams.app/{username}` em videos antes do upload ao Bunny. Opcoes: (a) FFmpeg server-side pre-upload, (b) Bunny Watermark API. |
| Watermark dinamico por viewer | MEDIA | Sobrepor username do VIEWER (nao so do creator) em tempo real via CSS/Canvas no player. Identifica quem fez screen recording. |
| Deteccao de screenshot (frontend) | MEDIA | CSS `user-select: none`, event listener `visibilitychange`, overlay durante captura de tela, blur quando tab perde foco. Nao impede 100%, mas dificulta. |

### Fase 3 — Medio Prazo

| Feature | Prioridade | Descricao |
|---------|-----------|-----------|
| Esteganografia em video (DCT/DWT) | MEDIA | Fingerprint invisivel em frames de video usando transformada discreta de cosseno. Sobrevive a recompressao e crop. Requer processamento pesado — considerar fila de jobs. |
| Forensic watermarking (A/B frame) | MEDIA | Servir versoes ligeiramente diferentes do video para cada viewer. Permite rastrear vazamento por comparacao de frames. |
| DMCA takedown automatizado | MEDIA | Bot que busca conteudo vazado em sites populares (Google Images reverse search, Reddit, Telegram) e envia takedown automaticamente. |
| Bloqueio por fingerprint de dispositivo | BAIXA | Fingerprint do browser/dispositivo (Canvas fingerprint, WebGL hash) vinculado ao usuario. Detecta acesso de contas compartilhadas. |

---

## 2. Sistema Financeiro (FanCoins)

### Implementado (MVP)

| Feature | Status | Descricao |
|---------|--------|-----------|
| Wallet atomica (PostgreSQL) | OK | Operacoes de debito/credito atomicas via SQL, previne race conditions |
| Compra por pacotes presetados | OK | 5 pacotes com bonus progressivo (10% a 50%) |
| Compra personalizada | OK | Usuario escolhe valor em R$ ou quantidade de FanCoins, conversao bidirecional automatica |
| Tips (fan → creator) | OK | Gorjeta com taxa de plataforma (15%) + ecosystem fund (1%) |
| Transferencia P2P (wallet → wallet) | OK | Busca por @username, mesma taxa de plataforma, notificacao, historico completo |
| PPV unlock | OK | Desbloqueio de conteudo pago com FanCoins |
| Multi-provider payment | OK | PIX (OpenPix/MercadoPago), Cartao (MercadoPago), Crypto (NOWPayments), PayPal |
| Webhook idempotente | OK | Previne double-credit via referenceId check |
| Anti-fraude em saques | OK | Risk scoring, cooldown 24h, limite diario, aprovacao manual > R$500 |
| Balance separado (bonus vs withdrawable) | OK | Coins comprados/bonus sao nao-sacaveis, apenas coins ganhos podem ser sacados |
| Ecosystem fund (1%) | OK | 1% de todas as transacoes acumulado em wallet da plataforma |

### Fase 2

| Feature | Prioridade | Descricao |
|---------|-----------|-----------|
| Rate limiting por IP em transferencias | ALTA | Limitar transferencias P2P por IP para prevenir lavagem de coins |
| Limite diario de transferencia P2P | ALTA | Max R$1000/dia em transferencias P2P por usuario |
| Verificacao KYC para transferencias grandes | ALTA | Exigir KYC verificado para transferencias > R$500 |
| Historico detalhado com filtros | MEDIA | Filtrar transacoes por tipo, data, usuario, valor |
| Exportacao CSV do historico | MEDIA | Download de extrato em CSV/PDF para declaracao fiscal |

---

## 3. Auditoria e Compliance

### Implementado (MVP)

| Feature | Status | Descricao |
|---------|--------|-----------|
| Audit log in-memory | OK | Buffer circular de 10.000 entries com output estruturado no console |
| Transaction log (fancoin_transactions) | OK | Registro completo de todas as operacoes financeiras no banco |
| Payment log (payments table) | OK | Registro de todos os pagamentos com metadata de provider |
| Payout log com risk scoring | OK | Registro de saques com flags de risco, IP, score |

### Fase 2

| Feature | Prioridade | Descricao |
|---------|-----------|-----------|
| Tabela audit_events persistente | ALTA | Tabela no banco para acoes criticas: login, mudanca de senha, operacoes admin, tentativas de fraude. TTL de 90 dias. Estimativa: ~5-10k events/dia com 1000 users ativos. |
| Dashboard de auditoria (admin) | MEDIA | Painel admin com busca/filtro de eventos de auditoria, visualizacao de padroes suspeitos |
| Alertas automaticos de fraude | MEDIA | Notificar admin automaticamente quando padroes suspeitos forem detectados (ex: multiplas transferencias em sequencia, saque imediato apos receber transferencia) |
| Log de acesso a conteudo | BAIXA | Registrar quem acessou qual conteudo (para casos de vazamento). Cuidado com volume — apenas conteudo PPV/exclusivo. |

---

## 4. Infraestrutura de Seguranca

### Implementado

| Feature | Status |
|---------|--------|
| JWT com refresh token | OK |
| Rate limiting (Redis/in-memory) | OK |
| CORS restrito | OK |
| Secure headers (Hono) | OK |
| Webhook signature verification (HMAC-SHA256/SHA512 timing-safe) | OK |
| Password hashing (bcrypt) | OK |
| OTP para saques grandes | OK |
| Sanitizacao de input (Zod schemas) | OK |

### Fase 2

| Feature | Prioridade | Descricao |
|---------|-----------|-----------|
| 2FA (TOTP) | ALTA | Autenticacao de dois fatores via Google Authenticator/Authy para login e operacoes financeiras |
| CSP (Content Security Policy) avancado | MEDIA | Headers CSP restritivos para prevenir XSS e injecao de scripts |
| WAF (Web Application Firewall) | MEDIA | Cloudflare WAF ou similar para protecao contra ataques automatizados |
| Geo-blocking | BAIXA | Bloquear acesso de paises com alto indice de fraude |

---

## 5. Diferenciais Competitivos vs Concorrentes

| Feature | FanDreams | OnlyFans | Privacy | Fansly |
|---------|-----------|----------|---------|--------|
| Watermark visual | Tileado diagonal | Simples canto | Nao | Simples |
| Esteganografia | LSB + HMAC | Nao | Nao | Nao |
| Compra personalizada | Bidirecional R$/Coins | Nao | Nao | Nao |
| Transferencia P2P | @username + taxas | Nao | Nao | Nao |
| Multi-crypto payment | Bitcoin, USDT, ETH | Nao | Parcial | Nao |
| Ecosystem fund | 1% automatico | Nao | Nao | Nao |
| DRM nativo | Fase 2 (Widevine/FairPlay) | Sim | Nao | Parcial |
| Forensic watermark video | Fase 3 | Parcial | Nao | Nao |
| DMCA automatizado | Fase 3 | Manual | Nao | Manual |
| Gamificacao (XP/Tiers) | Sim | Nao | Nao | Parcial |

---

## Prioridades de Implementacao

### Sprint Atual (Concluido)
1. ~~Compra personalizada de FanCoins~~
2. ~~Transferencia P2P wallet-to-wallet~~
3. ~~Watermark visual em imagens~~
4. ~~Esteganografia LSB em imagens~~
5. ~~Content protection headers~~

### Proximo Sprint (Recomendado)
1. DRM Bunny Stream (Widevine + FairPlay)
2. Referrer restriction no Bunny CDN
3. Watermark visual em videos (FFmpeg ou Bunny API)
4. Tabela audit_events persistente
5. Rate limiting em transferencias P2P

### Sprint Seguinte
1. 2FA (TOTP)
2. Watermark dinamico por viewer
3. Limites diarios P2P + KYC enforcement
4. Dashboard de auditoria admin
5. Deteccao de screenshot (frontend)

---

## Notas Tecnicas

### Esteganografia — Limitacoes Conhecidas
- **LSB e fragil a recompressao JPEG**: Se a imagem for salva como JPEG, os bits LSB sao destruidos. Por isso, imagens com steganografia sao salvas como PNG.
- **Screenshot destroi LSB**: Screenshot captura pixels renderizados, nao os dados LSB. O watermark visual e a protecao complementar para esse cenario.
- **Solucao futura**: Migrar para tecnicas baseadas em DCT (Discrete Cosine Transform) que sobrevivem a recompressao. Bibliotecas: `invisible-watermark` (Python) ou implementacao customizada.

### DRM — Como Ativar no Bunny Stream
1. Acessar Bunny Dashboard → Stream → Security
2. Ativar "DRM Protection"
3. Configurar Widevine License Server URL
4. No frontend, usar player compativel com EME (Encrypted Media Extensions) — ex: hls.js com suporte DRM ou Shaka Player
5. Modificar `bunny.service.ts` para gerar URLs DRM em vez de HLS simples

### Watermark em Video — Abordagens
1. **FFmpeg server-side**: Processar video antes do upload. Alto custo de CPU. Ideal para videos curtos.
   ```
   ffmpeg -i input.mp4 -vf "drawtext=text='fandreams.app/username':fontsize=24:fontcolor=white@0.3:x=(w-text_w)/2:y=(h-text_h)/2" output.mp4
   ```
2. **Bunny Watermark API**: Configurar imagem de watermark na biblioteca Bunny. Menor custo de infra, porem menos customizavel.
3. **Canvas overlay no player (frontend)**: Sobreposicao em tempo real. Nao altera o video original, mas visivel apenas durante reproducao. Pode ser removido por inspecao do DOM.

---

*Documento gerado em 2026-02-20. Atualizar conforme features forem implementadas.*

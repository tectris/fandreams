import Link from 'next/link'
import { Flame, ArrowRight, CreditCard, Bitcoin, QrCode, Shield, ChevronRight, Image, Video } from 'lucide-react'

const MOCK_CREATORS = [
  { username: 'isabellamorais', displayName: 'Isabella M.', photos: 142, videos: 38 },
  { username: 'rafasilva', displayName: 'Rafa Silva', photos: 87, videos: 24 },
  { username: 'brunacosta', displayName: 'Bruna C.', photos: 215, videos: 61 },
  { username: 'lucas.art', displayName: 'Lucas Art', photos: 63, videos: 19 },
  { username: 'amandafr', displayName: 'Amanda F.', photos: 194, videos: 52 },
  { username: 'thaisgomes', displayName: 'Thais G.', photos: 108, videos: 33 },
  { username: 'carolprado', displayName: 'Carol P.', photos: 176, videos: 45 },
  { username: 'daniribeiro', displayName: 'Dani R.', photos: 231, videos: 72 },
  { username: 'fernandajs', displayName: 'Fernanda J.', photos: 95, videos: 28 },
  { username: 'julianamoura', displayName: 'Juliana M.', photos: 157, videos: 41 },
]

const MOCK_TESTIMONIALS = [
  {
    quote: 'Migrei de outra plataforma e em 3 meses meu faturamento triplicou. A taxa de 8% faz diferenca real no fim do mes.',
    author: 'Criadora com 12k assinantes',
  },
  {
    quote: 'Saque via PIX seguro e rapido. Sem esperar 5 dias uteis, sem surpresa. Isso muda tudo.',
    author: 'Criadora com 8k assinantes',
  },
  {
    quote: 'A gamificacao faz meus fas voltarem todo dia. Nenhuma outra plataforma tem isso.',
    author: 'Criador com 5k assinantes',
  },
]

function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="w-14 h-14 rounded-full bg-surface-light flex items-center justify-center shrink-0">
      <span className="text-sm font-semibold text-muted">{initials}</span>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg text-foreground tracking-tight">FanDreams</span>
          </Link>
          <nav className="flex items-center gap-6">
            <a href="#para-criadores" className="hidden sm:block text-sm text-muted hover:text-foreground transition-colors">
              Para criadores
            </a>
            <Link href="/login" className="text-sm text-muted hover:text-foreground transition-colors">
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-primary border border-primary/30 hover:bg-primary/5 px-4 py-2 rounded-full transition-colors"
            >
              Criar conta
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="pt-24 sm:pt-32 pb-20 sm:pb-28">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight text-foreground">
            Seu conteudo.
            <br />
            Suas regras.
          </h1>
          <p className="mt-6 text-base sm:text-lg text-muted max-w-xl mx-auto leading-relaxed">
            Monetize o que voce cria com as menores taxas do Brasil, saque seguro via PIX e uma comunidade que valoriza quem cria.
          </p>
          <div className="mt-10">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold px-8 py-3.5 rounded-full text-base transition-colors"
            >
              Comecar agora
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Stats Strip ─── */}
      <section className="border-y border-border/40">
        <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-0 text-center">
          <div className="sm:flex-1">
            <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">92%</p>
            <p className="text-xs sm:text-sm text-muted mt-1">para o criador</p>
          </div>
          <div className="hidden sm:block w-px h-10 bg-border/40" />
          <div className="sm:flex-1">
            <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Seguro</p>
            <p className="text-xs sm:text-sm text-muted mt-1">saque via PIX</p>
          </div>
          <div className="hidden sm:block w-px h-10 bg-border/40" />
          <div className="sm:flex-1">
            <p className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">PIX</p>
            <p className="text-xs sm:text-sm text-muted mt-1">cartao e crypto</p>
          </div>
        </div>
      </section>

      {/* ─── Featured Creators Carousel ─── */}
      <section className="py-20 sm:py-24 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 mb-10">
          <p className="text-sm text-muted">Quem cria na FanDreams</p>
        </div>
        {/* Marquee track — duplicated for seamless loop */}
        <div className="relative">
          <div className="flex gap-6 animate-marquee">
            {[...MOCK_CREATORS, ...MOCK_CREATORS].map((creator, i) => (
              <div
                key={`${creator.username}-${i}`}
                className="flex items-center gap-3 shrink-0 group cursor-pointer"
              >
                <InitialsAvatar name={creator.displayName} />
                <div className="pr-4">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    @{creator.username}
                  </p>
                  <p className="flex items-center gap-2.5 text-xs text-muted mt-0.5">
                    <span className="inline-flex items-center gap-1"><Image className="w-3 h-3" />{creator.photos}</span>
                    <span className="inline-flex items-center gap-1"><Video className="w-3 h-3" />{creator.videos}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Differentials (Narrative Sections) ─── */}
      <section id="para-criadores">
        {/* Differential 1: Fee */}
        <div className="border-t border-border/40 py-20 sm:py-28">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid sm:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-xs font-medium text-primary uppercase tracking-wider mb-4">Vantagem real</p>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                  Menor taxa<br />do mercado
                </h2>
                <p className="mt-4 text-muted leading-relaxed">
                  Voce fica com 92% de tudo que ganha. Sem letras miudas, sem taxas escondidas.
                  A maioria das plataformas cobra 20% ou mais.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-foreground">FanDreams</span>
                    <span className="text-primary font-bold">8%</span>
                  </div>
                  <div className="w-full bg-surface rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: '8%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-muted">Mercado</span>
                    <span className="text-muted">20%</span>
                  </div>
                  <div className="w-full bg-surface rounded-full h-2.5">
                    <div className="bg-surface-light h-2.5 rounded-full" style={{ width: '20%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-muted">Concorrente internacional</span>
                    <span className="text-muted">25-30%</span>
                  </div>
                  <div className="w-full bg-surface rounded-full h-2.5">
                    <div className="bg-surface-light h-2.5 rounded-full" style={{ width: '27%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Differential 2: FanCoins */}
        <div className="border-t border-border/40 py-20 sm:py-28">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid sm:grid-cols-2 gap-12 items-center">
              <div className="order-2 sm:order-1 flex justify-center">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full border-2 border-warning/30 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center">
                      <span className="text-3xl font-bold text-warning">FC</span>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 text-xs font-bold text-foreground bg-surface-light px-2 py-0.5 rounded-full border border-border">
                    1 FC = R$0,01
                  </div>
                </div>
              </div>
              <div className="order-1 sm:order-2">
                <p className="text-xs font-medium text-warning uppercase tracking-wider mb-4">Moeda da plataforma</p>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                  FanCoins
                </h2>
                <p className="mt-4 text-muted leading-relaxed">
                  A moeda virtual do FanDreams. Fas compram com PIX ou cartao, usam para apoiar criadores com tips, desbloquear conteudo exclusivo e participar de campanhas.
                </p>
                <p className="mt-3 text-muted leading-relaxed">
                  Criadores sacam quando quiserem — cai na conta na hora via PIX.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Differential 3: Payment */}
        <div className="border-t border-border/40 py-20 sm:py-28">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid sm:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-xs font-medium text-success uppercase tracking-wider mb-4">Pagamento</p>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                  Pagamento seguro
                </h2>
                <p className="mt-4 text-muted leading-relaxed">
                  Saque via PIX de forma segura. USDT para quem prefere crypto. Sem esperar dias uteis, sem surpresa no extrato.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-4 bg-surface rounded-sm">
                  <QrCode className="w-6 h-6 text-success shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">PIX</p>
                    <p className="text-xs text-muted">Saque seguro, 24/7</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-surface rounded-sm">
                  <CreditCard className="w-6 h-6 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Cartao de Credito</p>
                    <p className="text-xs text-muted">Visa, Mastercard, Elo</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-surface rounded-sm">
                  <Bitcoin className="w-6 h-6 text-warning shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">USDT</p>
                    <p className="text-xs text-muted">Stablecoin, sem volatilidade</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="border-t border-border/40 py-20 sm:py-24">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sm text-muted mb-10">O que dizem sobre a plataforma</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {MOCK_TESTIMONIALS.map((t, i) => (
              <div key={i} className="space-y-4">
                <p className="text-sm text-foreground leading-relaxed">"{t.quote}"</p>
                <p className="text-xs text-muted">— {t.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="border-t border-border/40 py-24 sm:py-32">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Comece hoje. E gratis.
          </h2>
          <p className="mt-3 text-muted">
            Crie sua conta em 30 segundos e comece a monetizar.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold px-8 py-3.5 rounded-full text-base transition-colors"
            >
              Criar minha conta
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/40 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-foreground tracking-tight">FanDreams</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted">
              <Link href="#" className="hover:text-foreground transition-colors">Termos de Uso</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Politica de Privacidade</Link>
              <Link href="#" className="hover:text-foreground transition-colors">DMCA</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Compliance</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Contato</Link>
            </div>
            <p className="text-xs text-muted/60">2026 FanDreams</p>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted/40">
            <Shield className="w-3 h-3" />
            <span>Plataforma segura. Cobranca discreta no extrato.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

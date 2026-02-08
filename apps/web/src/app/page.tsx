import Link from 'next/link'
import { Flame, Coins, Trophy, Zap, ArrowRight, CreditCard, Bitcoin, Wallet } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <Flame className="w-7 h-7 text-primary" />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">FanDreams</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted hover:text-foreground transition-colors px-4 py-2">
              Entrar
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-primary hover:bg-primary-light text-white px-5 py-2 rounded-sm transition-colors"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 pt-24 pb-32 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight">
            Crie, compartilhe,{' '}
            <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              monetize
            </span>
          </h1>

          <p className="mt-8 text-lg md:text-xl text-muted max-w-2xl mx-auto leading-relaxed">
            A plataforma mais inovadora para criadores de conteudo.
            FanCoins, gamificacao e saques instantaneos via PIX.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-secondary text-white font-bold px-8 py-4 rounded-md text-lg hover:opacity-90 transition-opacity shadow-xl shadow-primary/25"
            >
              Comecar agora <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/explore"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-border text-foreground font-semibold px-8 py-4 rounded-md text-lg hover:bg-surface transition-colors"
            >
              Explorar criadores
            </Link>
          </div>

          {/* Minimal stats - 8% fee shown discretely */}
          <div className="mt-20 flex items-center justify-center gap-12 text-muted">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">92%</span>
              <span className="text-xs mt-1">para o criador</span>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">8%</span>
              <span className="text-xs mt-1">taxa plataforma</span>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-foreground">PIX</span>
              <span className="text-xs mt-1">saque instantaneo</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features - reduced to 3 */}
      <section className="py-28 border-t border-border/50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Por que criadores escolhem o <span className="text-primary">FanDreams</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mx-auto mb-5">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-3">Menor taxa do mercado</h3>
              <p className="text-sm text-muted leading-relaxed">
                Apenas 8% de comissao. Voce fica com 92% de tudo que ganha, muito mais que qualquer concorrente.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-5">
                <Coins className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-3">FanCoins</h3>
              <p className="text-sm text-muted leading-relaxed">
                Economia gamificada. Fas compram e enviam coins, presentes e desbloqueiam conteudo exclusivo.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-5">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-bold text-lg mb-3">Gamificacao</h3>
              <p className="text-sm text-muted leading-relaxed">
                Streaks, badges, leaderboards e missoes diarias. Engajamento que nenhum concorrente oferece.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para ganhar mais?
          </h2>
          <p className="text-lg text-muted mb-10">
            Junte-se aos criadores que ja faturam mais no FanDreams.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-secondary text-white font-bold px-8 py-4 rounded-md text-lg hover:opacity-90 transition-opacity shadow-xl shadow-primary/25"
          >
            Criar minha conta gratis <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Payment methods */}
      <section className="py-16 border-t border-border/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-muted mb-8">Formas de pagamento aceitas</p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2 text-muted">
              <Wallet className="w-5 h-5" />
              <span className="text-sm font-medium">PIX via Mercado Pago</span>
            </div>
            <div className="w-px h-5 bg-border hidden sm:block" />
            <div className="flex items-center gap-2 text-muted">
              <CreditCard className="w-5 h-5" />
              <span className="text-sm font-medium">PayPal</span>
            </div>
            <div className="w-px h-5 bg-border hidden sm:block" />
            <div className="flex items-center gap-2 text-muted">
              <Bitcoin className="w-5 h-5" />
              <span className="text-sm font-medium">Crypto</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-primary" />
              <span className="font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                FanDreams
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted">
              <Link href="#" className="hover:text-foreground transition-colors">
                Termos de uso
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Privacidade
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Contato
              </Link>
            </div>
            <p className="text-xs text-muted">2026 FanDreams. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import {
  Flame,
  ArrowRight,
  CreditCard,
  Bitcoin,
  QrCode,
  Shield,
  ChevronRight,
  Image,
  Video,
  Compass,
  TrendingDown,
  Zap,
  Trophy,
  Users,
  Lock,
  Sparkles,
  Play,
  Megaphone,
  Swords,
} from 'lucide-react'
import { CookieConsent } from '@/components/cookie-consent'
import { ContactModal } from '@/components/contact-modal'
import { PageContentModal } from '@/components/page-content-modal'

// ── Data ──

const MOCK_CREATORS = [
  { username: 'isabellamorais', displayName: 'Isabella M.', photos: 142, videos: 38, avatarSeed: 'isabella' },
  { username: 'rafasilva', displayName: 'Rafa Silva', photos: 87, videos: 24, avatarSeed: 'rafa' },
  { username: 'brunacosta', displayName: 'Bruna C.', photos: 215, videos: 61, avatarSeed: 'bruna' },
  { username: 'lucas.art', displayName: 'Lucas Art', photos: 63, videos: 19, avatarSeed: 'lucas-art' },
  { username: 'amandafr', displayName: 'Amanda F.', photos: 194, videos: 52, avatarSeed: 'amanda' },
  { username: 'thaisgomes', displayName: 'Thais G.', photos: 108, videos: 33, avatarSeed: 'thais' },
  { username: 'carolprado', displayName: 'Carol P.', photos: 176, videos: 45, avatarSeed: 'carol' },
  { username: 'daniribeiro', displayName: 'Dani R.', photos: 231, videos: 72, avatarSeed: 'dani' },
  { username: 'fernandajs', displayName: 'Fernanda J.', photos: 95, videos: 28, avatarSeed: 'fernanda' },
  { username: 'julianamoura', displayName: 'Juliana M.', photos: 157, videos: 41, avatarSeed: 'juliana' },
]

const MOCK_TESTIMONIALS = [
  {
    quote: 'Migrei de outra plataforma e em 3 meses meu faturamento triplicou. A taxa de 15% e muito menor que a concorrencia.',
    author: 'Criadora com 12k assinantes',
    avatarSeed: 'testimonial-1',
  },
  {
    quote: 'Saque via PIX seguro com verificacao antifraude em 24-48h. Sem esperar 5 dias uteis, sem surpresa. Isso muda tudo.',
    author: 'Criadora com 8k assinantes',
    avatarSeed: 'testimonial-2',
  },
  {
    quote: 'A gamificacao faz meus fas voltarem todo dia. Nenhuma outra plataforma tem isso.',
    author: 'Criador com 5k assinantes',
    avatarSeed: 'testimonial-3',
  },
]

const FEE_TIERS = [
  { subscribers: '0 - 100', fee: '15%', creatorGets: '85%', highlight: false },
  { subscribers: '101 - 500', fee: '13%', creatorGets: '87%', highlight: false },
  { subscribers: '501 - 2.000', fee: '11%', creatorGets: '89%', highlight: true },
  { subscribers: '2.001 - 5.000', fee: '9%', creatorGets: '91%', highlight: false },
  { subscribers: '5.001+', fee: '7%', creatorGets: '93%', highlight: false },
]

const FEATURES = [
  { icon: Zap, title: 'FanCoins', description: 'Moeda virtual para tips, desbloqueios e campanhas', color: 'text-warning' },
  { icon: Trophy, title: 'Gamificacao', description: 'Niveis, streaks e recompensas que fidelizam fas', color: 'text-primary' },
  { icon: Lock, title: 'Conteudo exclusivo', description: 'PPV, assinaturas e tiers de acesso', color: 'text-secondary' },
  { icon: Swords, title: 'Guildas', description: 'Criadores se unem em guildas com tesouraria compartilhada e assinaturas combo', color: 'text-diamond' },
  { icon: Megaphone, title: 'Pitch', description: 'Financiamento coletivo para projetos criativos apoiados pela comunidade', color: 'text-accent' },
  { icon: Users, title: 'Comunidade', description: 'Interacao direta entre criadores e fas', color: 'text-success' },
]

// ── Animated components ──

function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function AnimatedCounter({ value, suffix = '', prefix = '' }: { value: string; suffix?: string; prefix?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
    >
      {prefix}{value}{suffix}
    </motion.span>
  )
}

function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full animate-float-particle"
          style={{
            left: `${8 + (i * 7.5)}%`,
            background: i % 3 === 0 ? 'var(--color-primary)' : i % 3 === 1 ? 'var(--color-secondary)' : 'var(--color-warning)',
            opacity: 0.4,
            '--duration': `${10 + (i * 2)}s`,
            '--delay': `${i * 1.2}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

function MockVideoContent() {
  // Simulates a dynamic video background with floating creator cards and interactions
  const mockCards = [
    { seed: 'hero-1', name: 'Isabella M.', x: '10%', delay: 0, duration: 18 },
    { seed: 'hero-2', name: 'Rafa S.', x: '30%', delay: 3, duration: 22 },
    { seed: 'hero-3', name: 'Bruna C.', x: '55%', delay: 6, duration: 16 },
    { seed: 'hero-4', name: 'Lucas A.', x: '75%', delay: 1.5, duration: 20 },
    { seed: 'hero-5', name: 'Amanda F.', x: '90%', delay: 8, duration: 24 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated gradient base */}
      <div
        className="absolute inset-0 animate-hero-gradient opacity-25"
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 25%, var(--color-primary-dark) 50%, var(--color-warning) 75%, var(--color-primary) 100%)',
        }}
      />
      {/* Floating creator mini-cards */}
      {mockCards.map((card) => (
        <motion.div
          key={card.seed}
          className="absolute w-16 sm:w-20 opacity-[0.12]"
          style={{ left: card.x }}
          animate={{
            y: ['110vh', '-20vh'],
            rotate: [0, card.delay % 2 === 0 ? 8 : -8, 0],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            y: { duration: card.duration, repeat: Infinity, ease: 'linear', delay: card.delay },
            rotate: { duration: card.duration / 2, repeat: Infinity, ease: 'easeInOut', delay: card.delay },
            scale: { duration: card.duration / 3, repeat: Infinity, ease: 'easeInOut', delay: card.delay },
          }}
        >
          <div className="rounded-xl bg-surface border border-border/30 overflow-hidden shadow-lg">
            <img
              src={`https://picsum.photos/seed/${card.seed}/80/80`}
              alt=""
              className="w-full aspect-square object-cover"
            />
            <div className="p-1.5">
              <div className="h-1.5 w-10 bg-foreground/20 rounded-full" />
              <div className="h-1 w-6 bg-primary/30 rounded-full mt-1" />
            </div>
          </div>
        </motion.div>
      ))}
      {/* Floating interaction bubbles (tips, likes, etc) */}
      {[
        { emoji: 'FC', x: '20%', delay: 2, color: 'var(--color-warning)' },
        { emoji: '♥', x: '45%', delay: 5, color: 'var(--color-secondary)' },
        { emoji: 'FC', x: '70%', delay: 9, color: 'var(--color-warning)' },
        { emoji: '♥', x: '85%', delay: 12, color: 'var(--color-secondary)' },
      ].map((bubble, i) => (
        <motion.div
          key={`bubble-${i}`}
          className="absolute text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center opacity-[0.15]"
          style={{ left: bubble.x, color: bubble.color, border: `1px solid ${bubble.color}` }}
          animate={{ y: ['100vh', '-10vh'] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'linear', delay: bubble.delay }}
        >
          {bubble.emoji}
        </motion.div>
      ))}
      <FloatingParticles />
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
    </div>
  )
}

function HeroVideoBackground({ videoUrl }: { videoUrl?: string | null }) {
  if (videoUrl) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-20"
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>
    )
  }

  return <MockVideoContent />
}

// ── Main Page ──

export default function LandingPage() {
  const [contactOpen, setContactOpen] = useState(false)
  const [pageModal, setPageModal] = useState<{ key: string; title: string } | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const heroRef = useRef<HTMLElement>(null)

  const { scrollYProgress } = useScroll()
  const headerBg = useTransform(scrollYProgress, [0, 0.05], [0, 1])

  // Show sticky banner after scrolling past hero
  useEffect(() => {
    const handleScroll = () => {
      setShowBanner(window.scrollY > 600)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Sticky Promo Banner ─── */}
      {showBanner && (
        <div className="fixed top-0 left-0 right-0 z-[60] animate-slide-down">
          <div className="bg-gradient-to-r from-primary via-secondary to-primary text-white text-center py-2 px-4">
            <p className="text-xs sm:text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              Taxas a partir de 7% — a menor do mercado.{' '}
              <Link href="/register" className="underline font-bold hover:no-underline">
                Crie sua conta gratis
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <motion.header
        className="sticky top-0 z-50 backdrop-blur-md border-b border-transparent"
        style={{
          backgroundColor: `rgba(15, 15, 15, ${headerBg})`,
          borderColor: `rgba(45, 45, 68, ${headerBg})`,
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg text-foreground tracking-tight">FanDreams</span>
          </Link>
          <nav className="flex items-center gap-6">
            <a href="#para-criadores" className="hidden sm:block text-sm text-muted hover:text-foreground transition-colors">
              Para criadores
            </a>
            <Link href="/explore" className="hidden sm:block text-sm text-muted hover:text-foreground transition-colors">
              Explorar
            </Link>
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
      </motion.header>

      {/* ─── Hero Section ─── */}
      <section ref={heroRef} className="relative pt-16 sm:pt-24 pb-24 sm:pb-32 overflow-hidden">
        <HeroVideoBackground />

        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-surface/60 backdrop-blur-sm border border-border/50 rounded-full px-4 py-1.5 mb-8"
            >
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted">Plataforma brasileira para criadores</span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-foreground">
              Seu conteudo.
              <br />
              <span className="bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
                Suas regras.
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="mt-6 text-base sm:text-lg lg:text-xl text-muted max-w-2xl mx-auto leading-relaxed"
            >
              Monetize o que voce cria com as menores taxas do Brasil, saque seguro via PIX e uma comunidade que valoriza quem cria.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold px-8 py-4 rounded-full text-base transition-all animate-pulse-glow"
            >
              Comecar agora — e gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 border border-border/60 text-foreground hover:bg-surface-light/50 backdrop-blur-sm font-medium px-6 py-3.5 rounded-full text-sm transition-colors"
            >
              <Compass className="w-4 h-4" />
              Explorar criadores
            </Link>
          </motion.div>

          {/* Social proof mini-stats under hero */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-12 flex items-center justify-center gap-6 text-sm text-muted"
          >
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" />
              <span>+2.500 criadores</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-success" />
              <span>100% seguro</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
            <span className="hidden sm:flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-warning" />
              <span>PIX em 24-48h</span>
            </span>
          </motion.div>
        </div>
      </section>

      {/* ─── Animated Stats Strip ─── */}
      <section className="relative border-y border-border/40">
        <div className="absolute inset-0 animate-shimmer" />
        <div className="relative max-w-4xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-center gap-10 sm:gap-0 text-center">
          <AnimatedSection className="sm:flex-1">
            <p className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              <AnimatedCounter value="85" suffix="%" />
            </p>
            <p className="text-xs sm:text-sm text-muted mt-1">para o criador</p>
          </AnimatedSection>
          <div className="hidden sm:block w-px h-12 bg-border/40" />
          <AnimatedSection className="sm:flex-1" delay={0.15}>
            <p className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              <AnimatedCounter value="24-48" suffix="h" />
            </p>
            <p className="text-xs sm:text-sm text-muted mt-1">saque seguro via PIX</p>
          </AnimatedSection>
          <div className="hidden sm:block w-px h-12 bg-border/40" />
          <AnimatedSection className="sm:flex-1" delay={0.3}>
            <p className="text-4xl sm:text-5xl font-bold text-foreground tracking-tight">
              <AnimatedCounter value="3" />
            </p>
            <p className="text-xs sm:text-sm text-muted mt-1">formas de pagamento</p>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <AnimatedSection className="text-center mb-14">
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3">Tudo em um so lugar</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Ferramentas para crescer
            </h2>
          </AnimatedSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <AnimatedSection key={feature.title} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="p-6 rounded-xl bg-surface/50 border border-border/50 hover:border-primary/30 transition-colors h-full"
                >
                  <feature.icon className={`w-8 h-8 ${feature.color} mb-4`} />
                  <h3 className="font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{feature.description}</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured Creators Carousel ─── */}
      <section className="py-16 sm:py-20 overflow-hidden border-y border-border/40">
        <AnimatedSection>
          <div className="max-w-6xl mx-auto px-6 mb-10">
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-2">Comunidade</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Quem cria na FanDreams</h2>
          </div>
        </AnimatedSection>
        {/* Marquee track — duplicated for seamless loop */}
        <div className="relative">
          <div className="flex gap-6 animate-marquee">
            {[...MOCK_CREATORS, ...MOCK_CREATORS].map((creator, i) => (
              <div
                key={`${creator.username}-${i}`}
                className="flex items-center gap-3 shrink-0 group cursor-pointer"
              >
                <img
                  src={`https://picsum.photos/seed/${creator.avatarSeed}/56/56`}
                  alt={creator.displayName}
                  className="w-14 h-14 rounded-full object-cover shrink-0 ring-2 ring-border group-hover:ring-primary transition-colors"
                />
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
        {/* Differential 1: Fee comparison + Graduated table */}
        <div className="py-20 sm:py-28">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid sm:grid-cols-2 gap-12 items-center">
              <AnimatedSection>
                <p className="text-xs font-medium text-primary uppercase tracking-wider mb-4">Vantagem real</p>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                  Menor taxa<br />do mercado
                </h2>
                <p className="mt-4 text-muted leading-relaxed">
                  Comece com 85% de tudo que ganha. Quanto mais assinantes, menor a taxa. Sem letras miudas, sem taxas escondidas.
                </p>
              </AnimatedSection>
              <AnimatedSection delay={0.2}>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-foreground">FanDreams</span>
                      <span className="text-primary font-bold">a partir de 7%</span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
                      <motion.div
                        className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full"
                        initial={{ width: 0 }}
                        whileInView={{ width: '15%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.3 }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-muted">Mercado</span>
                      <span className="text-muted">20%</span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
                      <motion.div
                        className="bg-surface-light h-3 rounded-full"
                        initial={{ width: 0 }}
                        whileInView={{ width: '20%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium text-muted">Concorrente internacional</span>
                      <span className="text-muted">25-30%</span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-3 overflow-hidden">
                      <motion.div
                        className="bg-surface-light h-3 rounded-full"
                        initial={{ width: 0 }}
                        whileInView={{ width: '27%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.7 }}
                      />
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </div>

            {/* Graduated Fee Table */}
            <AnimatedSection className="mt-16" delay={0.2}>
              <div className="flex items-center gap-2 mb-6">
                <TrendingDown className="w-5 h-5 text-success" />
                <h3 className="text-lg font-bold text-foreground">Taxa regressiva: mais assinantes, menor taxa</h3>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface/50">
                      <th className="text-left py-3.5 px-5 text-muted font-medium">Assinantes</th>
                      <th className="text-center py-3.5 px-5 text-muted font-medium">Taxa plataforma</th>
                      <th className="text-center py-3.5 px-5 text-muted font-medium">Criador recebe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FEE_TIERS.map((tier, i) => (
                      <motion.tr
                        key={tier.subscribers}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08 }}
                        className={`border-b border-border/30 ${tier.highlight ? 'bg-primary/5' : ''}`}
                      >
                        <td className="py-3.5 px-5 font-medium text-foreground">{tier.subscribers}</td>
                        <td className="py-3.5 px-5 text-center">
                          <span className={`font-bold ${tier.highlight ? 'text-primary' : 'text-foreground'}`}>
                            {tier.fee}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <span className="font-bold text-success">{tier.creatorGets}</span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-muted">
                A taxa e calculada automaticamente com base no numero total de assinantes ativos. Conforme voce cresce, a plataforma premia sua fidelidade.
              </p>
            </AnimatedSection>
          </div>
        </div>

        {/* Differential 2: FanCoins */}
        <div className="border-t border-border/40 py-20 sm:py-28">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid sm:grid-cols-2 gap-12 items-center">
              <AnimatedSection className="order-2 sm:order-1 flex justify-center">
                <motion.div
                  whileHover={{ rotate: [0, -5, 5, 0], transition: { duration: 0.5 } }}
                  className="relative"
                >
                  <div className="w-32 h-32 rounded-full border-2 border-warning/30 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 rounded-full border border-dashed border-warning/20"
                    />
                    <div className="w-24 h-24 rounded-full bg-warning/10 flex items-center justify-center shadow-lg shadow-warning/5">
                      <span className="text-4xl font-bold text-warning">FC</span>
                    </div>
                  </div>
                  <div className="absolute -top-2 -right-2 text-xs font-bold text-foreground bg-surface-light px-2.5 py-1 rounded-full border border-border shadow-md">
                    1 FC = R$0,01
                  </div>
                </motion.div>
              </AnimatedSection>
              <AnimatedSection className="order-1 sm:order-2" delay={0.15}>
                <p className="text-xs font-medium text-warning uppercase tracking-wider mb-4">Moeda da plataforma</p>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                  FanCoins
                </h2>
                <p className="mt-4 text-muted leading-relaxed">
                  A moeda virtual do FanDreams. Fas compram com PIX ou cartao, usam para apoiar criadores com tips, desbloquear conteudo exclusivo e participar de campanhas.
                </p>
                <p className="mt-3 text-muted leading-relaxed">
                  Criadores sacam quando quiserem — saque via PIX processado em 24-48h com verificacao antifraude.
                </p>
              </AnimatedSection>
            </div>
          </div>
        </div>

        {/* Differential 3: Payment */}
        <div className="border-t border-border/40 py-20 sm:py-28">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid sm:grid-cols-2 gap-12 items-center">
              <AnimatedSection>
                <p className="text-xs font-medium text-success uppercase tracking-wider mb-4">Pagamento</p>
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                  Pagamento seguro
                </h2>
                <p className="mt-4 text-muted leading-relaxed">
                  Saque via PIX com verificacao antifraude em 24-48h. USDT para quem prefere crypto. Sem surpresa no extrato.
                </p>
              </AnimatedSection>
              <AnimatedSection delay={0.15}>
                <div className="space-y-3">
                  {[
                    { icon: QrCode, color: 'text-success', name: 'PIX', desc: 'Saque seguro, processado em 24-48h' },
                    { icon: CreditCard, color: 'text-primary', name: 'Cartao de Credito', desc: 'Visa, Mastercard, Elo' },
                    { icon: Bitcoin, color: 'text-warning', name: 'USDT', desc: 'Stablecoin, sem volatilidade' },
                  ].map((method, i) => (
                    <motion.div
                      key={method.name}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      whileHover={{ x: 4, transition: { duration: 0.2 } }}
                      className="flex items-center gap-4 p-4 bg-surface/50 rounded-xl border border-border/50 hover:border-primary/30 transition-colors"
                    >
                      <method.icon className={`w-6 h-6 ${method.color} shrink-0`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{method.name}</p>
                        <p className="text-xs text-muted">{method.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatedSection>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="border-t border-border/40 py-20 sm:py-24">
        <div className="max-w-4xl mx-auto px-6">
          <AnimatedSection>
            <p className="text-xs font-medium text-secondary uppercase tracking-wider mb-2">Depoimentos</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-10">O que dizem sobre a plataforma</h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-3 gap-6">
            {MOCK_TESTIMONIALS.map((t, i) => (
              <AnimatedSection key={i} delay={i * 0.12}>
                <motion.div
                  whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  className="p-6 rounded-xl bg-surface/30 border border-border/40 hover:border-primary/20 transition-colors h-full flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={`https://picsum.photos/seed/${t.avatarSeed}/40/40`}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-border"
                    />
                    <p className="text-xs text-muted font-medium">{t.author}</p>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed flex-1">&ldquo;{t.quote}&rdquo;</p>
                </motion.div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="border-t border-border/40 py-24 sm:py-32 relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0 animate-hero-gradient"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 50%, var(--color-primary) 100%)',
            }}
          />
        </div>
        <AnimatedSection className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Comece hoje.{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              E gratis.
            </span>
          </h2>
          <p className="mt-4 text-muted text-lg">
            Crie sua conta em 30 segundos e comece a monetizar.
          </p>
          <div className="mt-8">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold px-10 py-4 rounded-full text-base transition-all animate-pulse-glow"
            >
              Criar minha conta
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">Sem cartao de credito. Sem compromisso.</p>
        </AnimatedSection>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/40 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
            {/* Coluna 1: Sobre */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Flame className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm text-foreground tracking-tight">FanDreams</span>
              </div>
              <div className="space-y-2 text-xs text-muted">
                <button onClick={() => setContactOpen(true)} className="block hover:text-foreground transition-colors">Contato</button>
              </div>
            </div>

            {/* Coluna 2: Legal & Compliance */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-3">Legal & Compliance</p>
              <div className="space-y-2 text-xs text-muted">
                <button onClick={() => setPageModal({ key: 'terms_and_conditions', title: 'Termos de Uso' })} className="block hover:text-foreground transition-colors">Termos de Uso</button>
                <button onClick={() => setPageModal({ key: 'privacy_policy', title: 'Politica de Privacidade' })} className="block hover:text-foreground transition-colors">Privacidade</button>
                <button onClick={() => setPageModal({ key: 'cookie_policy', title: 'Politica de Cookies' })} className="block hover:text-foreground transition-colors">Cookies</button>
                <button onClick={() => setPageModal({ key: 'dmca', title: 'DMCA e Direitos Autorais' })} className="block hover:text-foreground transition-colors">DMCA</button>
                <button onClick={() => setPageModal({ key: 'compliance', title: 'Compliance' })} className="block hover:text-foreground transition-colors">Compliance</button>
                <button onClick={() => setPageModal({ key: 'acceptable_use_policy', title: 'Politica de Uso Aceitavel' })} className="block hover:text-foreground transition-colors">Uso Aceitavel</button>
                <button onClick={() => setPageModal({ key: 'age_verification', title: 'Verificacao de Idade' })} className="block hover:text-foreground transition-colors">Verificacao de Idade</button>
                <button onClick={() => setPageModal({ key: 'creator_contract', title: 'Contrato do Criador' })} className="block hover:text-foreground transition-colors">Contrato do Criador</button>
                <button onClick={() => setPageModal({ key: 'subscription_terms', title: 'Termos de Assinatura' })} className="block hover:text-foreground transition-colors">Termos de Assinatura</button>
                <button onClick={() => setPageModal({ key: 'complaints', title: 'Reclamacoes e Denuncias' })} className="block hover:text-foreground transition-colors">Reclamacoes</button>
                <button onClick={() => setPageModal({ key: 'anti_trafficking', title: 'Anti-Trafico' })} className="block hover:text-foreground transition-colors">Anti-Trafico</button>
              </div>
            </div>

            {/* Coluna 3: Seguranca & Transparencia */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-3">Seguranca</p>
              <div className="space-y-2 text-xs text-muted">
                <button onClick={() => setPageModal({ key: 'safety_center', title: 'Centro de Seguranca' })} className="block hover:text-foreground transition-colors">Centro de Seguranca</button>
                <button onClick={() => setPageModal({ key: 'community_guidelines', title: 'Diretrizes da Comunidade' })} className="block hover:text-foreground transition-colors">Diretrizes da Comunidade</button>
                <button onClick={() => setPageModal({ key: 'transparency_report', title: 'Transparencia' })} className="block hover:text-foreground transition-colors">Transparencia</button>
              </div>
            </div>

            {/* Coluna 4: Recursos */}
            <div>
              <p className="text-xs font-semibold text-foreground mb-3">Recursos</p>
              <div className="space-y-2 text-xs text-muted">
                <button onClick={() => setPageModal({ key: 'refund_policy', title: 'Reembolsos' })} className="block hover:text-foreground transition-colors">Pagamentos e Reembolsos</button>
                <button onClick={() => setPageModal({ key: 'tax_guide', title: 'Guia Tributario' })} className="block hover:text-foreground transition-colors">Guia Tributario</button>
                <button onClick={() => setPageModal({ key: 'accessibility', title: 'Acessibilidade' })} className="block hover:text-foreground transition-colors">Acessibilidade</button>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted/60">2026 FanDreams. Todos os direitos reservados.</p>
            <div className="flex items-center gap-2 text-xs text-muted/40">
              <Shield className="w-3 h-3" />
              <span>Plataforma segura. Cobranca discreta no extrato.</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── Cookie Consent ─── */}
      <CookieConsent />

      {/* ─── Contact Modal ─── */}
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />

      {/* ─── Page Content Modal (Legal & Compliance Pages) ─── */}
      <PageContentModal
        open={!!pageModal}
        onClose={() => setPageModal(null)}
        pageKey={pageModal?.key || ''}
        fallbackTitle={pageModal?.title || ''}
      />
    </div>
  )
}

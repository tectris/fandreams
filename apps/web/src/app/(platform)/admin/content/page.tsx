'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  FileText, Save, Eye, Cookie, MessageSquare, ArrowLeft, ShieldCheck, Scale,
  Users, ScrollText, Shield, BookOpen, AlertTriangle, Heart, BarChart3,
  Calculator, Accessibility, ChevronDown, ChevronRight, X, CheckCircle2
} from 'lucide-react'
import { HtmlEditor } from '@/components/html-editor'
import { toast } from 'sonner'
import Link from 'next/link'

type PageContent = { title: string; content: string; updatedAt: string }

// ─── Page definitions ───
type PageDef = {
  key: string
  tab: string
  label: string
  icon: React.ElementType
  route: string
  defaultTitle: string
  placeholder: string
}

const LEGAL_PAGES: PageDef[] = [
  {
    key: 'terms_and_conditions', tab: 'terms', label: 'Termos de Uso',
    icon: FileText, route: '/termos', defaultTitle: 'Termos de Uso',
    placeholder: '<h2>1. Aceitacao dos Termos</h2><p>Ao acessar e utilizar o FanDreams...</p>',
  },
  {
    key: 'privacy_policy', tab: 'privacy', label: 'Privacidade',
    icon: FileText, route: '/privacidade', defaultTitle: 'Politica de Privacidade',
    placeholder: '<h2>1. Informacoes que coletamos</h2><p>Coletamos informacoes que voce nos fornece...</p>',
  },
  {
    key: 'cookie_policy', tab: 'cookie_policy', label: 'Pol. de Cookies',
    icon: Cookie, route: '/cookies', defaultTitle: 'Politica de Cookies',
    placeholder: '<h2>1. O que sao Cookies</h2><p>Cookies sao pequenos arquivos de texto armazenados no seu dispositivo...</p>',
  },
  {
    key: 'dmca', tab: 'dmca', label: 'DMCA / Direitos Autorais',
    icon: ShieldCheck, route: '/dmca', defaultTitle: 'DMCA e Protecao de Direitos Autorais',
    placeholder: '<h2>DMCA e Direitos Autorais</h2><p>FanDreams respeita os direitos de propriedade intelectual...</p>',
  },
  {
    key: 'compliance', tab: 'compliance', label: 'Compliance',
    icon: Scale, route: '/compliance', defaultTitle: 'Compliance',
    placeholder: '<h2>Programa de Compliance</h2><p>O FanDreams mantem um programa robusto de compliance...</p>',
  },
  {
    key: 'acceptable_use_policy', tab: 'aup', label: 'Uso Aceitavel',
    icon: ScrollText, route: '/uso-aceitavel', defaultTitle: 'Politica de Uso Aceitavel',
    placeholder: '<h2>1. Conteudo Permitido</h2><p>A FanDreams permite conteudo adulto entre criadores verificados...</p>',
  },
  {
    key: 'age_verification', tab: 'age_verification', label: 'Verificacao de Idade',
    icon: Shield, route: '/verificacao-idade', defaultTitle: 'Verificacao de Idade e USC 2257',
    placeholder: '<h2>1. Compromisso com a Verificacao de Idade</h2><p>A FanDreams exige que todos os criadores de conteudo sejam maiores de 18 anos...</p>',
  },
]

const CONTRACT_PAGES: PageDef[] = [
  {
    key: 'creator_contract', tab: 'creator_contract', label: 'Contrato do Criador',
    icon: Users, route: '/contrato-criador', defaultTitle: 'Contrato do Criador',
    placeholder: '<h2>1. Objeto do Contrato</h2><p>Este contrato rege a relacao entre o Criador e a FanDreams...</p>',
  },
  {
    key: 'subscription_terms', tab: 'subscription_terms', label: 'Termos de Assinatura',
    icon: Heart, route: '/termos-assinatura', defaultTitle: 'Termos de Assinatura do Fa',
    placeholder: '<h2>1. Assinatura de Conteudo</h2><p>Ao assinar um criador na FanDreams, voce concorda com os seguintes termos...</p>',
  },
  {
    key: 'refund_policy', tab: 'refund_policy', label: 'Reembolsos',
    icon: Calculator, route: '/reembolsos', defaultTitle: 'Politica de Pagamentos e Reembolsos',
    placeholder: '<h2>1. Politica de Reembolso</h2><p>A FanDreams oferece reembolso nas seguintes condicoes...</p>',
  },
]

const SAFETY_PAGES: PageDef[] = [
  {
    key: 'safety_center', tab: 'safety_center', label: 'Centro de Seguranca',
    icon: Shield, route: '/seguranca', defaultTitle: 'Centro de Seguranca e Transparencia',
    placeholder: '<h2>Nosso Compromisso</h2><p>A FanDreams esta comprometida com a seguranca de todos os usuarios...</p>',
  },
  {
    key: 'community_guidelines', tab: 'community_guidelines', label: 'Diretrizes da Comunidade',
    icon: BookOpen, route: '/diretrizes-comunidade', defaultTitle: 'Diretrizes da Comunidade',
    placeholder: '<h2>Bem-vindo a comunidade FanDreams</h2><p>Estas diretrizes existem para manter um ambiente seguro e respeitoso...</p>',
  },
  {
    key: 'complaints', tab: 'complaints', label: 'Reclamacoes / Denuncias',
    icon: AlertTriangle, route: '/reclamacoes', defaultTitle: 'Processo de Reclamacoes e Denuncias',
    placeholder: '<h2>Como Fazer uma Denuncia</h2><p>Se voce encontrou conteudo que viola nossas politicas...</p>',
  },
  {
    key: 'anti_trafficking', tab: 'anti_trafficking', label: 'Anti-Trafico',
    icon: Shield, route: '/anti-trafico', defaultTitle: 'Declaracao Anti-Escravidao e Anti-Trafico',
    placeholder: '<h2>Nosso Compromisso</h2><p>A FanDreams tem tolerancia zero com escravidao moderna e trafico humano...</p>',
  },
  {
    key: 'transparency_report', tab: 'transparency_report', label: 'Transparencia',
    icon: BarChart3, route: '/transparencia', defaultTitle: 'Relatorio de Transparencia',
    placeholder: '<h2>Relatorio de Transparencia</h2><p>Publicamos periodicamente dados sobre nossas acoes de moderacao...</p>',
  },
]

const RESOURCE_PAGES: PageDef[] = [
  {
    key: 'tax_guide', tab: 'tax_guide', label: 'Guia Tributario',
    icon: Calculator, route: '/guia-tributario', defaultTitle: 'Guia Tributario para Criadores',
    placeholder: '<h2>Obrigacoes Fiscais</h2><p>Como criador na FanDreams, voce e responsavel por suas obrigacoes tributarias...</p>',
  },
  {
    key: 'accessibility', tab: 'accessibility', label: 'Acessibilidade',
    icon: Accessibility, route: '/acessibilidade', defaultTitle: 'Declaracao de Acessibilidade',
    placeholder: '<h2>Nosso Compromisso com a Acessibilidade</h2><p>A FanDreams esta comprometida em tornar nossa plataforma acessivel a todos...</p>',
  },
]

const ALL_PAGES = [...LEGAL_PAGES, ...CONTRACT_PAGES, ...SAFETY_PAGES, ...RESOURCE_PAGES]

type CategoryKey = 'legal' | 'contracts' | 'safety' | 'resources' | 'operational'

const CATEGORIES: { key: CategoryKey; label: string; icon: React.ElementType; pages: PageDef[] }[] = [
  { key: 'legal', label: 'Legal & Compliance', icon: Scale, pages: LEGAL_PAGES },
  { key: 'contracts', label: 'Contratos & Pagamentos', icon: ScrollText, pages: CONTRACT_PAGES },
  { key: 'safety', label: 'Seguranca & Transparencia', icon: Shield, pages: SAFETY_PAGES },
  { key: 'resources', label: 'Recursos', icon: BookOpen, pages: RESOURCE_PAGES },
  { key: 'operational', label: 'Operacional', icon: MessageSquare, pages: [] },
]

export default function AdminContentPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [activeCategory, setActiveCategory] = useState<CategoryKey>('legal')
  const [activeTab, setActiveTab] = useState('terms')

  // ─── State for all editable pages ───
  const [pageTitles, setPageTitles] = useState<Record<string, string>>({})
  const [pageContents, setPageContents] = useState<Record<string, string>>({})

  // ─── Queries for all pages using useQueries ───
  const pageQueryResults = useQueries({
    queries: ALL_PAGES.map(page => ({
      queryKey: ['admin', 'page', page.key],
      queryFn: async () => {
        const res = await api.get<PageContent>(`/platform/page/${page.key}`)
        return { key: page.key, data: res.data }
      },
    })),
  })

  // ─── Cookie stats ───
  const { data: cookieStats } = useQuery({
    queryKey: ['admin', 'cookie-stats'],
    queryFn: async () => {
      const res = await api.get<any>('/platform/admin/cookie-consents/stats')
      return res.data
    },
  })

  // ─── Contact messages ───
  const { data: messagesData } = useQuery({
    queryKey: ['admin', 'contact-messages'],
    queryFn: async () => {
      const res = await api.get<any>('/platform/admin/contact-messages')
      return res.data
    },
  })

  // ─── Load fetched data into state ───
  useEffect(() => {
    const newTitles: Record<string, string> = {}
    const newContents: Record<string, string> = {}
    let hasNew = false

    for (const result of pageQueryResults) {
      if (result.data) {
        const { key, data } = result.data
        const page = ALL_PAGES.find(p => p.key === key)
        if (!page) continue

        if (pageTitles[key] === undefined && data?.title) {
          newTitles[key] = data.title
          hasNew = true
        }
        if (pageContents[key] === undefined && data?.content !== undefined) {
          newContents[key] = data.content || ''
          hasNew = true
        }
      }
    }

    if (hasNew) {
      if (Object.keys(newTitles).length > 0) {
        setPageTitles(prev => ({ ...prev, ...newTitles }))
      }
      if (Object.keys(newContents).length > 0) {
        setPageContents(prev => ({ ...prev, ...newContents }))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageQueryResults.map(r => r.dataUpdatedAt).join(',')])

  // ─── Generic save mutation ───
  const saveMutation = useMutation({
    mutationFn: ({ key, title, content }: { key: string; title: string; content: string }) =>
      api.post(`/platform/admin/page/${key}`, { title, content }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'page', variables.key] })
      const page = ALL_PAGES.find(p => p.key === variables.key)
      toast.success(`${page?.label || 'Pagina'} salva com sucesso!`)
      setActiveTab('')
    },
    onError: (e: any) => toast.error(e.message),
  })

  function closeEditor() {
    setActiveTab('')
  }

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/platform/admin/contact-messages/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] })
    },
  })

  // ─── Helpers ───
  const getTitle = (key: string, defaultTitle: string) => pageTitles[key] ?? defaultTitle
  const getContent = (key: string) => pageContents[key] ?? ''
  const setTitle = (key: string, value: string) => setPageTitles(prev => ({ ...prev, [key]: value }))
  const setContentFor = (key: string, value: string) => setPageContents(prev => ({ ...prev, [key]: value }))

  // ─── Render page editor ───
  function renderPageEditor(page: PageDef) {
    return (
      <Card key={page.key}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">{page.label}</h2>
            <div className="flex items-center gap-1">
              <Link href={page.route} target="_blank">
                <Button variant="ghost" size="sm"><Eye className="w-4 h-4 mr-1" /> Visualizar</Button>
              </Link>
              <button
                onClick={closeEditor}
                className="p-1.5 rounded-md hover:bg-surface-light text-muted hover:text-foreground transition-colors"
                title="Fechar editor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Titulo"
            value={getTitle(page.key, page.defaultTitle)}
            onChange={(e) => setTitle(page.key, e.target.value)}
          />
          <HtmlEditor
            value={getContent(page.key)}
            onChange={(v) => setContentFor(page.key, v)}
            placeholder={page.placeholder}
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={() => saveMutation.mutate({
                key: page.key,
                title: getTitle(page.key, page.defaultTitle),
                content: getContent(page.key),
              })}
              loading={saveMutation.isPending && saveMutation.variables?.key === page.key}
            >
              <Save className="w-4 h-4 mr-1" /> Salvar
            </Button>
            <Button variant="ghost" onClick={closeEditor}>
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ─── Active page def ───
  const activePage = ALL_PAGES.find(p => p.tab === activeTab)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <FileText className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Conteudo da Plataforma</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ─── Sidebar with categories ─── */}
        <aside className="lg:w-64 shrink-0">
          <nav className="space-y-1">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.key
              const Icon = cat.icon
              return (
                <div key={cat.key}>
                  <button
                    onClick={() => {
                      setActiveCategory(cat.key)
                      if (cat.pages.length > 0) {
                        setActiveTab(cat.pages[0].tab)
                      } else if (cat.key === 'operational') {
                        setActiveTab('cookies_stats')
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:text-foreground hover:bg-surface-light'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{cat.label}</span>
                    {cat.key === 'operational' && messagesData?.unread > 0 && (
                      <Badge variant="error" className="text-[10px] px-1.5">{messagesData.unread}</Badge>
                    )}
                    {isActive ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>

                  {/* Sub-items for page categories */}
                  {isActive && cat.pages.length > 0 && (
                    <div className="ml-4 mt-1 space-y-0.5">
                      {cat.pages.map(page => {
                        const PageIcon = page.icon
                        return (
                          <button
                            key={page.tab}
                            onClick={() => setActiveTab(page.tab)}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                              activeTab === page.tab ? 'bg-surface-light text-foreground font-medium' : 'text-muted hover:text-foreground'
                            }`}
                          >
                            <PageIcon className="w-3.5 h-3.5" />
                            {page.label}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Operational sub-items */}
                  {isActive && cat.key === 'operational' && (
                    <div className="ml-4 mt-1 space-y-0.5">
                      <button
                        onClick={() => setActiveTab('cookies_stats')}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                          activeTab === 'cookies_stats' ? 'bg-surface-light text-foreground font-medium' : 'text-muted hover:text-foreground'
                        }`}
                      >
                        <Cookie className="w-3.5 h-3.5" />
                        Cookies (Stats)
                      </button>
                      <button
                        onClick={() => setActiveTab('messages')}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                          activeTab === 'messages' ? 'bg-surface-light text-foreground font-medium' : 'text-muted hover:text-foreground'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Mensagens
                        {messagesData?.unread > 0 && (
                          <Badge variant="error" className="text-[10px] px-1.5 ml-auto">{messagesData.unread}</Badge>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </aside>

        {/* ─── Content area ─── */}
        <div className="flex-1 min-w-0">
          {/* Page editor for any legal/contract/safety/resource page */}
          {activePage && renderPageEditor(activePage)}

          {/* Empty state when no page is selected */}
          {!activePage && activeTab !== 'cookies_stats' && activeTab !== 'messages' && (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="w-10 h-10 text-muted mx-auto mb-3" />
                <p className="text-muted">Selecione uma pagina ao lado para editar</p>
              </CardContent>
            </Card>
          )}

          {/* Cookie Consent Stats */}
          {activeTab === 'cookies_stats' && (
            <Card>
              <CardHeader>
                <h2 className="font-bold">Rastreabilidade de Cookies</h2>
              </CardHeader>
              <CardContent>
                {cookieStats ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-surface-light p-4 rounded-sm text-center">
                      <p className="text-2xl font-bold text-foreground">{cookieStats.total}</p>
                      <p className="text-xs text-muted mt-1">Total de interacoes</p>
                    </div>
                    <div className="bg-surface-light p-4 rounded-sm text-center">
                      <p className="text-2xl font-bold text-success">{cookieStats.accepted}</p>
                      <p className="text-xs text-muted mt-1">Aceitos</p>
                    </div>
                    <div className="bg-surface-light p-4 rounded-sm text-center">
                      <p className="text-2xl font-bold text-error">{cookieStats.rejected}</p>
                      <p className="text-xs text-muted mt-1">Recusados</p>
                    </div>
                    <div className="bg-surface-light p-4 rounded-sm text-center">
                      <p className="text-2xl font-bold text-primary">{cookieStats.last30Days}</p>
                      <p className="text-xs text-muted mt-1">Ultimos 30 dias</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted text-center py-6">Carregando estatisticas...</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Contact Messages */}
          {activeTab === 'messages' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold">Mensagens de Contato</h2>
                  {messagesData?.unread > 0 && (
                    <Badge variant="warning">{messagesData.unread} nao lidas</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {messagesData?.items?.length > 0 ? (
                  <div className="space-y-4">
                    {messagesData.items.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-sm border ${msg.isRead ? 'border-border bg-surface' : 'border-primary/30 bg-primary/5'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-semibold text-foreground">{msg.name}</p>
                              {!msg.isRead && <Badge variant="primary">Nova</Badge>}
                            </div>
                            <p className="text-xs text-muted">{msg.email}{msg.whatsapp && ` | ${msg.whatsapp}`}</p>
                            <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">{msg.message}</p>
                            <p className="text-xs text-muted mt-2">
                              {new Date(msg.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!msg.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markReadMutation.mutate(msg.id)}
                            >
                              Marcar como lida
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted text-center py-6">Nenhuma mensagem de contato</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

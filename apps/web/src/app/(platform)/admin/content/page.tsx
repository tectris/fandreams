'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FileText, Save, Eye, Cookie, MessageSquare, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

type PageContent = { title: string; content: string; updatedAt: string }

export default function AdminContentPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'cookies' | 'messages'>('terms')

  // Terms
  const [termsTitle, setTermsTitle] = useState('Termos de Uso')
  const [termsContent, setTermsContent] = useState('')

  // Privacy
  const [privacyTitle, setPrivacyTitle] = useState('Politica de Privacidade')
  const [privacyContent, setPrivacyContent] = useState('')

  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/feed')
  }, [user, router])

  const { data: termsData } = useQuery({
    queryKey: ['admin', 'page', 'terms_and_conditions'],
    queryFn: async () => {
      const res = await api.get<PageContent>('/platform/page/terms_and_conditions')
      return res.data
    },
    enabled: user?.role === 'admin',
  })

  const { data: privacyData } = useQuery({
    queryKey: ['admin', 'page', 'privacy_policy'],
    queryFn: async () => {
      const res = await api.get<PageContent>('/platform/page/privacy_policy')
      return res.data
    },
    enabled: user?.role === 'admin',
  })

  const { data: cookieStats } = useQuery({
    queryKey: ['admin', 'cookie-stats'],
    queryFn: async () => {
      const res = await api.get<any>('/platform/admin/cookie-consents/stats')
      return res.data
    },
    enabled: user?.role === 'admin',
  })

  const { data: messagesData } = useQuery({
    queryKey: ['admin', 'contact-messages'],
    queryFn: async () => {
      const res = await api.get<any>('/platform/admin/contact-messages')
      return res.data
    },
    enabled: user?.role === 'admin',
  })

  // Load fetched data into state
  useEffect(() => {
    if (termsData) {
      setTermsTitle(termsData.title || 'Termos de Uso')
      setTermsContent(termsData.content || '')
    }
  }, [termsData])

  useEffect(() => {
    if (privacyData) {
      setPrivacyTitle(privacyData.title || 'Politica de Privacidade')
      setPrivacyContent(privacyData.content || '')
    }
  }, [privacyData])

  const saveTermsMutation = useMutation({
    mutationFn: () => api.post('/platform/admin/page/terms_and_conditions', { title: termsTitle, content: termsContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'page', 'terms_and_conditions'] })
      toast.success('Termos de Uso salvos!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const savePrivacyMutation = useMutation({
    mutationFn: () => api.post('/platform/admin/page/privacy_policy', { title: privacyTitle, content: privacyContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'page', 'privacy_policy'] })
      toast.success('Politica de Privacidade salva!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/platform/admin/contact-messages/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] })
    },
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <FileText className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Conteudo da Plataforma</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant={activeTab === 'terms' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('terms')}>
          <FileText className="w-4 h-4 mr-1" /> Termos
        </Button>
        <Button variant={activeTab === 'privacy' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('privacy')}>
          <FileText className="w-4 h-4 mr-1" /> Privacidade
        </Button>
        <Button variant={activeTab === 'cookies' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('cookies')}>
          <Cookie className="w-4 h-4 mr-1" /> Cookies
        </Button>
        <Button variant={activeTab === 'messages' ? 'primary' : 'ghost'} size="sm" onClick={() => setActiveTab('messages')}>
          <MessageSquare className="w-4 h-4 mr-1" /> Mensagens
          {messagesData?.unread > 0 && (
            <Badge variant="error" className="ml-1">{messagesData.unread}</Badge>
          )}
        </Button>
      </div>

      {/* Terms Editor */}
      {activeTab === 'terms' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Termos de Uso</h2>
              <Link href="/termos" target="_blank">
                <Button variant="ghost" size="sm"><Eye className="w-4 h-4 mr-1" /> Visualizar</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Titulo"
              value={termsTitle}
              onChange={(e) => setTermsTitle(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Conteudo (HTML)</label>
              <textarea
                value={termsContent}
                onChange={(e) => setTermsContent(e.target.value)}
                rows={20}
                placeholder="<h2>1. Aceitacao dos Termos</h2><p>Ao acessar e utilizar o FanDreams...</p>"
                className="w-full px-4 py-2.5 rounded-sm bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono text-sm"
              />
              <p className="text-xs text-muted">Use tags HTML: h2, h3, p, ul, li, a, strong, em</p>
            </div>
            <Button onClick={() => saveTermsMutation.mutate()} loading={saveTermsMutation.isPending}>
              <Save className="w-4 h-4 mr-1" /> Salvar Termos
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Privacy Editor */}
      {activeTab === 'privacy' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Politica de Privacidade</h2>
              <Link href="/privacidade" target="_blank">
                <Button variant="ghost" size="sm"><Eye className="w-4 h-4 mr-1" /> Visualizar</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Titulo"
              value={privacyTitle}
              onChange={(e) => setPrivacyTitle(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Conteudo (HTML)</label>
              <textarea
                value={privacyContent}
                onChange={(e) => setPrivacyContent(e.target.value)}
                rows={20}
                placeholder="<h2>1. Informacoes que coletamos</h2><p>Coletamos informacoes que voce nos fornece...</p>"
                className="w-full px-4 py-2.5 rounded-sm bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono text-sm"
              />
              <p className="text-xs text-muted">Use tags HTML: h2, h3, p, ul, li, a, strong, em</p>
            </div>
            <Button onClick={() => savePrivacyMutation.mutate()} loading={savePrivacyMutation.isPending}>
              <Save className="w-4 h-4 mr-1" /> Salvar Politica
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cookie Consent Stats */}
      {activeTab === 'cookies' && (
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
  )
}

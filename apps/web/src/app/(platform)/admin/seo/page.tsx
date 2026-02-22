'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Globe, Upload, Save, ArrowLeft, ImageIcon, Code, Tag, Video, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

type SeoSettings = {
  logoUrl: string | null
  heroVideoUrl: string | null
  keywords: string
  pixelCode: string
  googleAdsCode: string
  headScripts: string
}

export default function AdminSeoPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [keywords, setKeywords] = useState('')
  const [pixelCode, setPixelCode] = useState('')
  const [googleAdsCode, setGoogleAdsCode] = useState('')
  const [headScripts, setHeadScripts] = useState('')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [heroVideoUrl, setHeroVideoUrl] = useState<string | null>(null)

  const { data: seoData } = useQuery({
    queryKey: ['admin', 'seo'],
    queryFn: async () => {
      const res = await api.get<SeoSettings>('/platform/seo')
      return res.data
    },
  })

  useEffect(() => {
    if (seoData) {
      setKeywords(seoData.keywords || '')
      setPixelCode(seoData.pixelCode || '')
      setGoogleAdsCode(seoData.googleAdsCode || '')
      setHeadScripts(seoData.headScripts || '')
      setLogoPreview(seoData.logoUrl || null)
      setHeroVideoUrl(seoData.heroVideoUrl || null)
    }
  }, [seoData])

  const saveMutation = useMutation({
    mutationFn: (updates: Partial<SeoSettings>) => api.patch('/platform/admin/seo', updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'seo'] })
      toast.success('Configuracoes SEO salvas!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const logoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const res = await api.upload<{ url: string }>('/upload/avatar', file)
      return res.data
    },
    onSuccess: (data) => {
      if (data?.url) {
        setLogoPreview(data.url)
        saveMutation.mutate({ logoUrl: data.url })
      }
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao enviar logo'),
  })

  const videoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const res = await api.upload<{ url: string }>('/upload/avatar', file)
      return res.data
    },
    onSuccess: (data) => {
      if (data?.url) {
        setHeroVideoUrl(data.url)
        saveMutation.mutate({ heroVideoUrl: data.url })
      }
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao enviar video'),
  })

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['video/mp4', 'video/webm']
    if (!validTypes.includes(file.type)) {
      toast.error('Formato aceito: MP4 ou WebM')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video deve ter no maximo 50MB')
      return
    }

    videoUploadMutation.mutate(file)
  }

  function handleRemoveVideo() {
    setHeroVideoUrl(null)
    saveMutation.mutate({ heroVideoUrl: null })
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Formato aceito: JPG, PNG, SVG ou WebP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo deve ter no maximo 5MB')
      return
    }

    logoUploadMutation.mutate(file)
  }

  function handleSave() {
    saveMutation.mutate({ keywords, pixelCode, googleAdsCode, headScripts })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-muted hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Globe className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Logo & SEO</h1>
      </div>

      {/* Logo Upload */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Logo da Plataforma
          </h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div
              onClick={() => logoInputRef.current?.click()}
              className="w-24 h-24 rounded-md border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center cursor-pointer transition-colors bg-surface-light overflow-hidden"
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Upload className="w-8 h-8 text-muted" />
              )}
            </div>
            <div>
              <p className="text-sm text-foreground font-medium">Upload de logo</p>
              <p className="text-xs text-muted mt-1">Formatos: JPG, PNG, SVG ou WebP. Maximo 5MB.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => logoInputRef.current?.click()}
                loading={logoUploadMutation.isPending}
              >
                <Upload className="w-4 h-4 mr-1" />
                {logoUploadMutation.isPending ? 'Enviando...' : 'Escolher arquivo'}
              </Button>
            </div>
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/svg+xml,image/webp"
            onChange={handleLogoChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Hero Video Upload */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Video do Hero (Pagina Inicial)
          </h2>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted mb-4">
            Video de fundo para a secao hero da pagina inicial. Recomendado: MP4, ate 50MB, resolucao 1920x1080 ou superior. Se nenhum video for enviado, um gradiente animado sera exibido.
          </p>
          {heroVideoUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden border border-border bg-surface-dark">
                <video
                  src={heroVideoUrl}
                  className="w-full max-h-48 object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                  loading={videoUploadMutation.isPending}
                >
                  <Upload className="w-4 h-4 mr-1" />
                  Substituir video
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveVideo}
                  className="text-error hover:text-error"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => videoInputRef.current?.click()}
              className="w-full h-32 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors bg-surface-light"
            >
              {videoUploadMutation.isPending ? (
                <p className="text-sm text-muted">Enviando video...</p>
              ) : (
                <>
                  <Video className="w-8 h-8 text-muted mb-2" />
                  <p className="text-sm text-muted">Clique para enviar um video</p>
                  <p className="text-xs text-muted/60 mt-1">MP4 ou WebM, maximo 50MB</p>
                </>
              )}
            </div>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm"
            onChange={handleVideoChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Keywords */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Meta Keywords
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Keywords (separadas por virgula)</label>
            <textarea
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              rows={3}
              placeholder="criadores, monetizacao, conteudo exclusivo, fancoins, assinatura, pix"
              className="w-full px-4 py-2.5 rounded-sm bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-y text-sm"
            />
            <p className="text-xs text-muted">Keywords ajudam mecanismos de busca a encontrar sua plataforma</p>
          </div>
        </CardContent>
      </Card>

      {/* Tracking Codes */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <Code className="w-5 h-5 text-primary" />
            Codigos de Rastreamento
          </h2>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Facebook Pixel / Meta Pixel</label>
            <textarea
              value={pixelCode}
              onChange={(e) => setPixelCode(e.target.value)}
              rows={6}
              placeholder={"<!-- Meta Pixel Code -->\n<script>\n!function(f,b,e,v,n,t,s)...\n</script>"}
              className="w-full px-4 py-2.5 rounded-sm bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Google Ads / Google Tag Manager</label>
            <textarea
              value={googleAdsCode}
              onChange={(e) => setGoogleAdsCode(e.target.value)}
              rows={6}
              placeholder={"<!-- Google tag (gtag.js) -->\n<script async src=\"https://www.googletagmanager.com/gtag/js?id=AW-XXXXXX\"></script>"}
              className="w-full px-4 py-2.5 rounded-sm bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Scripts customizados (head)</label>
            <textarea
              value={headScripts}
              onChange={(e) => setHeadScripts(e.target.value)}
              rows={6}
              placeholder="Insira scripts que devem ser carregados no <head> da pagina"
              className="w-full px-4 py-2.5 rounded-sm bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-y font-mono text-xs"
            />
            <p className="text-xs text-muted">Codigo inserido no head de todas as paginas</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} loading={saveMutation.isPending} className="w-full">
        <Save className="w-4 h-4 mr-1" /> Salvar configuracoes SEO
      </Button>
    </div>
  )
}

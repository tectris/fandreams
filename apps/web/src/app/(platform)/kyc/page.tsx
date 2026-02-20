'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api, API_BASE_URL } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Shield,
  Camera,
  Upload,
  CreditCard,
  User,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Eye,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

type StepId = 'terms' | 'intro' | 'doc-front' | 'doc-back' | 'selfie' | 'review' | 'done'

const STEPS: { id: StepId; label: string }[] = [
  { id: 'terms', label: 'Termos' },
  { id: 'intro', label: 'Inicio' },
  { id: 'doc-front', label: 'Frente' },
  { id: 'doc-back', label: 'Verso' },
  { id: 'selfie', label: 'Selfie' },
  { id: 'review', label: 'Revisar' },
]

type RequiredDocument = {
  key: string
  label: string
  route: string
  category: string
  required: boolean
}

export default function KycPage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const [currentStep, setCurrentStep] = useState<StepId>('terms')
  const [docFront, setDocFront] = useState<{ file: File; preview: string } | null>(null)
  const [docBack, setDocBack] = useState<{ file: File; preview: string } | null>(null)
  const [selfie, setSelfie] = useState<{ file: File; preview: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Terms acceptance state
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([])
  const [acceptedDocs, setAcceptedDocs] = useState<Set<string>>(new Set())
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [acceptingTerms, setAcceptingTerms] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<string | null>(null)
  const [viewingDocContent, setViewingDocContent] = useState<{ title: string; content: string } | null>(null)
  const [loadingDocContent, setLoadingDocContent] = useState(false)

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep)

  // Load required documents and check which ones the user already accepted
  useEffect(() => {
    async function loadDocuments() {
      try {
        const [docsRes, acceptancesRes] = await Promise.all([
          api.get<{ documents: RequiredDocument[] }>('/platform/documents/list'),
          api.get<{ documents: Array<{ key: string; accepted: boolean }> }>('/platform/documents'),
        ])

        const required = docsRes.data.documents.filter((d: RequiredDocument) => d.required)
        setRequiredDocs(required)

        // Pre-check already accepted documents
        const alreadyAccepted = new Set<string>()
        for (const doc of acceptancesRes.data.documents) {
          if (doc.accepted) alreadyAccepted.add(doc.key)
        }
        setAcceptedDocs(alreadyAccepted)

        // If all required docs are already accepted, skip to intro
        const allAccepted = required.every((d: RequiredDocument) => alreadyAccepted.has(d.key))
        if (allAccepted) {
          setCurrentStep('intro')
        }
      } catch (e) {
        console.error('Failed to load documents:', e)
      } finally {
        setLoadingDocs(false)
      }
    }
    loadDocuments()
  }, [])

  function handleSkip() {
    router.push('/feed')
  }

  function goNext() {
    const idx = STEPS.findIndex((s) => s.id === currentStep)
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1].id)
  }

  function goBack() {
    const idx = STEPS.findIndex((s) => s.id === currentStep)
    if (idx > 0) setCurrentStep(STEPS[idx - 1].id)
  }

  function toggleDocAcceptance(key: string) {
    setAcceptedDocs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  async function viewDocument(key: string) {
    setViewingDoc(key)
    setLoadingDocContent(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/platform/page/${key}`)
      const json = await res.json()
      if (json.success && json.data) {
        setViewingDocContent(json.data)
      } else {
        setViewingDocContent({ title: 'Documento', content: '<p>Conteudo sera publicado em breve.</p>' })
      }
    } catch {
      setViewingDocContent({ title: 'Documento', content: '<p>Erro ao carregar documento.</p>' })
    } finally {
      setLoadingDocContent(false)
    }
  }

  async function handleAcceptTerms() {
    const allRequired = requiredDocs.every((d) => acceptedDocs.has(d.key))
    if (!allRequired) {
      toast.error('Voce precisa aceitar todos os documentos obrigatorios para continuar')
      return
    }

    setAcceptingTerms(true)
    try {
      // Send acceptance to API with the list of accepted document keys
      const keysToAccept = Array.from(acceptedDocs)
      await api.post('/platform/documents/accept', { documentKeys: keysToAccept })
      toast.success('Termos aceitos com sucesso!')
      goNext()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao aceitar termos')
    } finally {
      setAcceptingTerms(false)
    }
  }

  async function handleFileSelect(
    file: File,
    setter: (val: { file: File; preview: string } | null) => void,
  ) {
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no maximo 10MB')
      return
    }
    const preview = URL.createObjectURL(file)
    setter({ file, preview })
  }

  async function handleSubmit() {
    if (!docFront || !docBack || !selfie) return

    setSubmitting(true)
    try {
      // Upload all 3 documents
      setUploading(true)
      const [frontRes, backRes, selfieRes] = await Promise.all([
        api.upload<{ key: string }>('/media/upload', docFront.file),
        api.upload<{ key: string }>('/media/upload', docBack.file),
        api.upload<{ key: string }>('/media/upload', selfie.file),
      ])
      setUploading(false)

      // Submit KYC
      await api.post('/kyc/submit', {
        documentFrontKey: frontRes.data.key,
        documentBackKey: backRes.data.key,
        selfieKey: selfieRes.data.key,
      })

      // Update local user state
      if (user) {
        setUser({ ...user, kycStatus: 'pending' })
      }

      setCurrentStep('done')
      toast.success('Documentos enviados com sucesso!')
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar documentos')
    } finally {
      setSubmitting(false)
      setUploading(false)
    }
  }

  const allRequiredAccepted = requiredDocs.every((d) => acceptedDocs.has(d.key))

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Progress bar */}
      {currentStep !== 'done' && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    i < stepIndex
                      ? 'bg-primary text-white'
                      : i === stepIndex
                        ? 'bg-primary text-white ring-4 ring-primary/20'
                        : 'bg-surface-light text-muted'
                  }`}
                >
                  {i < stepIndex ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-6 sm:w-10 h-0.5 mx-0.5 transition-colors duration-300 ${
                      i < stepIndex ? 'bg-primary' : 'bg-surface-light'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted">
            {STEPS[stepIndex]?.label}
          </p>
        </div>
      )}

      {/* Step: Terms Acceptance */}
      {currentStep === 'terms' && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-xl font-bold mb-2">Termos e Condicoes</h1>
              <p className="text-muted text-sm leading-relaxed">
                Antes de prosseguir com a verificacao, voce precisa ler e aceitar
                os documentos legais obrigatorios da plataforma.
              </p>
            </div>

            {loadingDocs ? (
              <div className="space-y-3 mb-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-14 bg-surface-light rounded-md" />
                ))}
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                {requiredDocs.map((doc) => {
                  const isAccepted = acceptedDocs.has(doc.key)
                  return (
                    <div
                      key={doc.key}
                      className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                        isAccepted
                          ? 'border-success/30 bg-success/5'
                          : 'border-border bg-surface-light'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleDocAcceptance(doc.key)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isAccepted
                            ? 'bg-success border-success'
                            : 'border-muted hover:border-primary'
                        }`}
                      >
                        {isAccepted && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </button>

                      {/* Label */}
                      <span className="text-sm font-medium flex-1">{doc.label}</span>

                      {/* View button */}
                      <button
                        onClick={() => viewDocument(doc.key)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs text-primary hover:bg-primary/10 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ler
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="p-3 rounded-md bg-surface-light border border-border mb-6">
              <p className="text-xs text-muted leading-relaxed">
                Ao aceitar, voce confirma que leu e concorda com todos os documentos
                listados acima. Seu aceite sera registrado com data, hora e informacoes
                de auditoria conforme a LGPD.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleAcceptTerms}
                className="w-full"
                disabled={!allRequiredAccepted}
                loading={acceptingTerms}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Aceitar e continuar
              </Button>
              <button
                onClick={handleSkip}
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Pular por agora
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document viewer modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setViewingDoc(null); setViewingDocContent(null) }} />
          <div className="relative bg-surface border border-border rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h3 className="font-bold text-sm truncate">
                {viewingDocContent?.title || 'Carregando...'}
              </h3>
              <div className="flex items-center gap-2">
                {viewingDocContent && (
                  <a
                    href={requiredDocs.find((d) => d.key === viewingDoc)?.route}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md hover:bg-surface-light text-muted hover:text-primary transition-colors"
                    title="Abrir em nova aba"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => { setViewingDoc(null); setViewingDocContent(null) }}
                  className="p-1.5 rounded-md hover:bg-surface-light text-muted hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loadingDocContent ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-6 w-48 bg-surface-light rounded" />
                  <div className="h-4 w-full bg-surface-light rounded" />
                  <div className="h-4 w-3/4 bg-surface-light rounded" />
                </div>
              ) : viewingDocContent ? (
                <div
                  className="prose prose-invert prose-sm max-w-none text-muted [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: viewingDocContent.content }}
                />
              ) : null}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-border shrink-0">
              <Button
                className="w-full"
                onClick={() => {
                  if (viewingDoc && !acceptedDocs.has(viewingDoc)) {
                    toggleDocAcceptance(viewingDoc)
                  }
                  setViewingDoc(null)
                  setViewingDocContent(null)
                }}
              >
                {viewingDoc && acceptedDocs.has(viewingDoc) ? (
                  'Fechar'
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Li e aceito este documento
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Intro */}
      {currentStep === 'intro' && (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-xl font-bold mb-2">Verificacao de identidade</h1>
            <p className="text-muted text-sm mb-6 leading-relaxed">
              Para garantir a seguranca da plataforma e proteger nossos usuarios,
              precisamos verificar sua identidade antes de permitir o envio de
              imagens e videos.
            </p>

            <div className="space-y-3 text-left mb-8">
              <div className="flex items-start gap-3 p-3 rounded-md bg-surface-light">
                <CreditCard className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Documento com foto</p>
                  <p className="text-xs text-muted">RG, CNH ou passaporte (frente e verso)</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-md bg-surface-light">
                <User className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Selfie com documento</p>
                  <p className="text-xs text-muted">Uma foto sua segurando o documento ao lado do rosto</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={goNext} className="w-full">
                Comecar verificacao
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <button
                onClick={handleSkip}
                className="text-sm text-muted hover:text-foreground transition-colors"
              >
                Pular por agora
              </button>
            </div>

            <div className="mt-6 flex items-start gap-2 p-3 rounded-md bg-warning/5 border border-warning/20">
              <AlertCircle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-muted text-left">
                Sem verificacao, voce pode usar a plataforma normalmente, mas nao
                podera postar imagens ou videos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Document Front */}
      {currentStep === 'doc-front' && (
        <DocumentUploadStep
          title="Frente do documento"
          description="Tire uma foto ou envie a imagem da frente do seu documento (RG, CNH ou passaporte)"
          icon={<CreditCard className="w-8 h-8 text-primary" />}
          file={docFront}
          onFileSelect={(f) => handleFileSelect(f, setDocFront)}
          onClear={() => {
            if (docFront) URL.revokeObjectURL(docFront.preview)
            setDocFront(null)
          }}
          onNext={goNext}
          onBack={goBack}
          onSkip={handleSkip}
          canProceed={!!docFront}
        />
      )}

      {/* Step: Document Back */}
      {currentStep === 'doc-back' && (
        <DocumentUploadStep
          title="Verso do documento"
          description="Agora a parte de tras do mesmo documento"
          icon={<CreditCard className="w-8 h-8 text-primary rotate-180" />}
          file={docBack}
          onFileSelect={(f) => handleFileSelect(f, setDocBack)}
          onClear={() => {
            if (docBack) URL.revokeObjectURL(docBack.preview)
            setDocBack(null)
          }}
          onNext={goNext}
          onBack={goBack}
          onSkip={handleSkip}
          canProceed={!!docBack}
        />
      )}

      {/* Step: Selfie */}
      {currentStep === 'selfie' && (
        <DocumentUploadStep
          title="Selfie com documento"
          description="Tire uma foto segurando seu documento ao lado do rosto. Seu rosto e o documento devem estar visiveis."
          icon={<Camera className="w-8 h-8 text-primary" />}
          file={selfie}
          onFileSelect={(f) => handleFileSelect(f, setSelfie)}
          onClear={() => {
            if (selfie) URL.revokeObjectURL(selfie.preview)
            setSelfie(null)
          }}
          onNext={goNext}
          onBack={goBack}
          onSkip={handleSkip}
          canProceed={!!selfie}
          isSelfie
        />
      )}

      {/* Step: Review */}
      {currentStep === 'review' && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-bold text-center mb-1">Revise seus documentos</h2>
            <p className="text-sm text-muted text-center mb-6">
              Confira se as imagens estao nítidas e legiveis
            </p>

            <div className="space-y-4 mb-6">
              <ReviewItem label="Frente do documento" preview={docFront?.preview} />
              <ReviewItem label="Verso do documento" preview={docBack?.preview} />
              <ReviewItem label="Selfie com documento" preview={selfie?.preview} />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={goBack} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1"
                loading={submitting}
                disabled={!docFront || !docBack || !selfie}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-1" />
                    Enviar para analise
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Done */}
      {currentStep === 'done' && (
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-xl font-bold mb-2">Documentos enviados!</h1>
            <p className="text-muted text-sm mb-8 leading-relaxed">
              Seus documentos foram enviados com sucesso e estao em analise.
              Voce sera notificado quando a verificacao for concluida.
            </p>
            <Button onClick={() => router.push('/feed')} className="w-full">
              Ir para o feed
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function DocumentUploadStep({
  title,
  description,
  icon,
  file,
  onFileSelect,
  onClear,
  onNext,
  onBack,
  onSkip,
  canProceed,
  isSelfie,
}: {
  title: string
  description: string
  icon: React.ReactNode
  file: { file: File; preview: string } | null
  onFileSelect: (file: File) => void
  onClear: () => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
  canProceed: boolean
  isSelfie?: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            {icon}
          </div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="text-sm text-muted mt-1">{description}</p>
        </div>

        {file ? (
          <div className="relative mb-6">
            <img
              src={file.preview}
              alt={title}
              className="w-full rounded-md border border-border object-contain max-h-64"
            />
            <button
              onClick={onClear}
              className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white hover:bg-black/90 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-2 bg-success/90 text-white text-xs px-2 py-1 rounded-sm flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Imagem selecionada
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className="border-2 border-dashed border-border rounded-md p-8 text-center hover:border-primary/50 transition-colors">
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-3">
                  {/* Camera button */}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture={isSelfie ? 'user' : 'environment'}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) onFileSelect(f)
                      e.target.value = ''
                    }}
                  />
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-3 rounded-md bg-primary text-white font-medium text-sm hover:bg-primary-light transition-colors"
                  >
                    <Camera className="w-5 h-5" />
                    Tirar foto
                  </button>

                  {/* Upload button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) onFileSelect(f)
                      e.target.value = ''
                    }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-3 rounded-md border border-border text-foreground font-medium text-sm hover:border-primary/50 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    Enviar arquivo
                  </button>
                </div>
                <p className="text-xs text-muted">JPG, PNG ou WEBP ate 10MB</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
          <Button onClick={onNext} className="flex-1" disabled={!canProceed}>
            Continuar
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <button
          onClick={onSkip}
          className="w-full mt-3 text-sm text-muted hover:text-foreground transition-colors text-center"
        >
          Pular por agora
        </button>
      </CardContent>
    </Card>
  )
}

function ReviewItem({ label, preview }: { label: string; preview?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-md bg-surface-light">
      {preview ? (
        <img src={preview} alt={label} className="w-16 h-12 rounded object-cover border border-border" />
      ) : (
        <div className="w-16 h-12 rounded bg-surface flex items-center justify-center border border-border">
          <X className="w-4 h-4 text-muted" />
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
      </div>
      {preview ? (
        <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 text-error shrink-0" />
      )}
    </div>
  )
}

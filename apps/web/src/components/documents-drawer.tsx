'use client'

import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, API_BASE_URL } from '@/lib/api'
import {
  X,
  FileText,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  ArrowLeft,
  Shield,
  Scale,
  Landmark,
  BookOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type DocumentInfo = {
  key: string
  label: string
  route: string
  category: string
  required: boolean
  accepted: boolean
  acceptedAt: string | null
  documentVersion: string | null
}

type DocumentsDrawerProps = {
  open: boolean
  onClose: () => void
}

const CATEGORY_CONFIG = {
  essential: {
    label: 'Essenciais',
    icon: Shield,
    description: 'Documentos obrigatorios para uso da plataforma',
  },
  policies: {
    label: 'Politicas da Plataforma',
    icon: Scale,
    description: 'Regras e diretrizes da comunidade',
  },
  compliance: {
    label: 'Compliance e Seguranca',
    icon: BookOpen,
    description: 'Conformidade regulatoria e seguranca',
  },
  financial: {
    label: 'Financeiro e Contratos',
    icon: Landmark,
    description: 'Termos financeiros e contratuais',
  },
} as const

export function DocumentsDrawer({ open, onClose }: DocumentsDrawerProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['essential']))
  const [viewingDocument, setViewingDocument] = useState<string | null>(null)

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['my-documents'],
    queryFn: async () => {
      const res = await api.get<{ documents: DocumentInfo[] }>('/platform/documents')
      return res.data.documents
    },
    enabled: open,
  })

  const documents = documentsData || []

  function toggleCategory(category: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  function getDocsByCategory(category: string) {
    return documents.filter((d) => d.category === category)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!open) return null

  // If viewing a specific document, show the document viewer
  if (viewingDocument) {
    return (
      <DocumentViewer
        documentKey={viewingDocument}
        onBack={() => setViewingDocument(null)}
        onClose={onClose}
      />
    )
  }

  const acceptedCount = documents.filter((d) => d.accepted).length
  const totalCount = documents.length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-surface border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Documentos Legais
            </h2>
            <p className="text-xs text-muted mt-1">
              {acceptedCount} de {totalCount} documentos aceitos
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-light text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 py-3 border-b border-border">
          <div className="w-full h-2 bg-surface-light rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: totalCount > 0 ? `${(acceptedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-surface-light rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-2">
              {Object.entries(CATEGORY_CONFIG).map(([categoryKey, config]) => {
                const categoryDocs = getDocsByCategory(categoryKey)
                const isExpanded = expandedCategories.has(categoryKey)
                const acceptedInCategory = categoryDocs.filter((d) => d.accepted).length
                const CategoryIcon = config.icon

                return (
                  <div key={categoryKey} className="border-b border-border last:border-0">
                    {/* Category header */}
                    <button
                      onClick={() => toggleCategory(categoryKey)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-light/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon className="w-4 h-4 text-primary" />
                        <div className="text-left">
                          <p className="text-sm font-semibold">{config.label}</p>
                          <p className="text-xs text-muted">{acceptedInCategory}/{categoryDocs.length} aceitos</p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted" />
                      )}
                    </button>

                    {/* Category documents */}
                    {isExpanded && (
                      <div className="pb-2">
                        {categoryDocs.map((doc) => (
                          <div
                            key={doc.key}
                            className="flex items-center gap-3 px-6 py-3 mx-3 rounded-md hover:bg-surface-light/50 transition-colors"
                          >
                            {/* Status icon */}
                            {doc.accepted ? (
                              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-muted shrink-0" />
                            )}

                            {/* Document info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{doc.label}</p>
                              {doc.accepted && doc.acceptedAt ? (
                                <p className="text-xs text-success">
                                  Aceito em {formatDate(doc.acceptedAt)}
                                </p>
                              ) : doc.required ? (
                                <p className="text-xs text-warning">Aceite pendente</p>
                              ) : (
                                <p className="text-xs text-muted">Opcional</p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => setViewingDocument(doc.key)}
                                className="p-1.5 rounded-md hover:bg-surface-light text-muted hover:text-primary transition-colors"
                                title="Visualizar documento"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {doc.accepted && (
                                <button
                                  onClick={() => handleDownloadPdf(doc.key, doc.label)}
                                  className="p-1.5 rounded-md hover:bg-surface-light text-muted hover:text-primary transition-colors"
                                  title="Baixar PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Document Viewer Component (shows inside the drawer)
function DocumentViewer({
  documentKey,
  onBack,
  onClose,
}: {
  documentKey: string
  onBack: () => void
  onClose: () => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['document-pdf-data', documentKey],
    queryFn: async () => {
      const res = await api.get<{
        title: string
        content: string
        updatedAt: string
        acceptance: {
          acceptedAt: string
          documentVersion: string
          verificationHash: string
        } | null
        user: { email: string; displayName: string; username: string }
      }>(`/platform/documents/${documentKey}/pdf-data`)
      return res.data
    },
  })

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Viewer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-surface border-l border-border shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-surface-light text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold truncate">{data?.title || 'Carregando...'}</h3>
            {data?.updatedAt && (
              <p className="text-xs text-muted">
                Atualizado em {new Date(data.updatedAt).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
          {data?.acceptance && (
            <button
              onClick={() => handleDownloadPdf(documentKey, data.title)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-light text-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Acceptance badge */}
        {data?.acceptance && (
          <div className="px-6 py-3 border-b border-border bg-success/5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <div>
                <p className="text-xs font-medium text-success">
                  Aceito por {data.user.email}
                </p>
                <p className="text-xs text-muted">
                  {new Date(data.acceptance.acceptedAt).toLocaleString('pt-BR')} &middot; Hash: {data.acceptance.verificationHash}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-48 bg-surface-light rounded" />
              <div className="h-4 w-full bg-surface-light rounded" />
              <div className="h-4 w-3/4 bg-surface-light rounded" />
              <div className="h-4 w-full bg-surface-light rounded" />
            </div>
          ) : data?.content ? (
            <div
              className="prose prose-invert prose-sm max-w-none text-muted [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-foreground [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: data.content }}
            />
          ) : (
            <div className="text-center py-20">
              <p className="text-muted">Este documento sera publicado em breve.</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// PDF download handler (client-side generation)
async function handleDownloadPdf(documentKey: string, documentLabel: string) {
  try {
    const res = await api.get<{
      title: string
      content: string
      updatedAt: string
      acceptance: {
        acceptedAt: string
        documentVersion: string
        verificationHash: string
      } | null
      user: { email: string; displayName: string; username: string }
    }>(`/platform/documents/${documentKey}/pdf-data`)

    const data = res.data

    // Create a printable HTML document
    const printContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>${data.title} - FanDreams</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
          h1 { font-size: 24px; margin-bottom: 8px; color: #111; }
          h2 { font-size: 18px; margin-top: 32px; margin-bottom: 12px; color: #222; }
          h3 { font-size: 15px; margin-top: 24px; margin-bottom: 8px; color: #333; }
          p { margin-bottom: 16px; font-size: 14px; }
          ul, ol { padding-left: 24px; margin-bottom: 16px; }
          li { margin-bottom: 4px; font-size: 14px; }
          a { color: #6d28d9; }
          .header { border-bottom: 2px solid #6d28d9; padding-bottom: 16px; margin-bottom: 24px; }
          .header img { height: 32px; margin-bottom: 8px; }
          .meta { font-size: 12px; color: #666; margin-bottom: 4px; }
          .footer { margin-top: 48px; padding-top: 16px; border-top: 2px solid #6d28d9; font-size: 11px; color: #666; }
          .footer .acceptance { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 6px; margin-bottom: 12px; }
          .footer .acceptance p { margin-bottom: 4px; font-size: 12px; color: #166534; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.title}</h1>
          <p class="meta">FanDreams - Plataforma de Conteudo</p>
          <p class="meta">Ultima atualizacao: ${new Date(data.updatedAt).toLocaleDateString('pt-BR')}</p>
        </div>
        <div class="content">
          ${data.content}
        </div>
        <div class="footer">
          ${data.acceptance ? `
            <div class="acceptance">
              <p><strong>Registro de Aceite</strong></p>
              <p>Documento aceito por: ${data.user.email} (${data.user.displayName || data.user.username})</p>
              <p>Data e hora: ${new Date(data.acceptance.acceptedAt).toLocaleString('pt-BR')}</p>
              <p>Versao do documento: ${data.acceptance.documentVersion}</p>
              <p>Hash de verificacao: ${data.acceptance.verificationHash}</p>
            </div>
          ` : ''}
          <p>Documento gerado em ${new Date().toLocaleString('pt-BR')} via FanDreams.</p>
          <p>Este documento tem validade legal conforme Lei Geral de Protecao de Dados (LGPD) e Marco Civil da Internet.</p>
        </div>
      </body>
      </html>
    `

    // Open in new window for printing/saving as PDF
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      // Small delay to ensure content is loaded before triggering print
      setTimeout(() => {
        printWindow.print()
      }, 500)
    } else {
      toast.error('Permita pop-ups para baixar o PDF')
    }
  } catch (e: any) {
    toast.error(e.message || 'Erro ao gerar PDF')
  }
}

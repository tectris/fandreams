'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Shield,
  UserCheck,
  UserX,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Camera,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import Link from 'next/link'

type KycSubmission = {
  id: string
  userId: string
  documentFrontKey: string
  documentBackKey: string
  selfieKey: string
  status: string
  rejectedReason: string | null
  submittedAt: string
  reviewedAt: string | null
  username: string
  displayName: string | null
  email: string
  avatarUrl: string | null
}

type KycResponse = {
  submissions: KycSubmission[]
  total: number
  counts: {
    pending: number
    approved: number
    rejected: number
    all: number
  }
}

const statusTabs = [
  { value: 'pending', label: 'Pendentes', icon: Clock, color: 'text-warning' },
  { value: 'approved', label: 'Aprovados', icon: CheckCircle2, color: 'text-success' },
  { value: 'rejected', label: 'Rejeitados', icon: XCircle, color: 'text-error' },
  { value: 'all', label: 'Todos', icon: FileText, color: 'text-muted' },
]

export default function AdminKycPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [reviewingDoc, setReviewingDoc] = useState<KycSubmission | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'kyc', statusFilter, page],
    queryFn: () =>
      api.get<KycResponse>(`/admin/kyc?status=${statusFilter}&page=${page}&limit=20`),
  })

  const reviewMutation = useMutation({
    mutationFn: ({ docId, approved, rejectedReason }: { docId: string; approved: boolean; rejectedReason?: string }) =>
      api.post(`/admin/kyc/${docId}/review`, { approved, rejectedReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      setReviewingDoc(null)
      setRejectReason('')
      toast.success('KYC revisado com sucesso!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao revisar'),
  })

  const submissions = data?.data?.submissions ?? []
  const counts = data?.data?.counts
  const total = data?.data?.total ?? 0

  function getMediaUrl(key: string) {
    return api.getMediaUrl(key)
  }

  function handleApprove(doc: KycSubmission) {
    reviewMutation.mutate({ docId: doc.id, approved: true })
  }

  function handleReject(doc: KycSubmission) {
    if (!rejectReason.trim()) {
      toast.error('Informe o motivo da rejeicao')
      return
    }
    reviewMutation.mutate({ docId: doc.id, approved: false, rejectedReason: rejectReason })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Verificacao KYC</h1>
          <p className="text-sm text-muted">Revisar documentos de identidade dos usuarios</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {statusTabs.map((tab) => {
          const count = counts?.[tab.value as keyof typeof counts] ?? 0
          return (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1) }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-sm border text-sm whitespace-nowrap transition-colors ${
                statusFilter === tab.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted hover:border-primary/50'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${statusFilter === tab.value ? 'text-primary' : tab.color}`} />
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                statusFilter === tab.value ? 'bg-primary/20' : 'bg-surface-light'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Submissions list */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-surface-light rounded-md animate-pulse" />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserCheck className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted">Nenhuma submissao {statusFilter === 'pending' ? 'pendente' : 'encontrada'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => (
            <Card key={sub.id} className={reviewingDoc?.id === sub.id ? 'border-primary' : ''}>
              <CardContent className="pt-5">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* User info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-surface-light flex items-center justify-center text-sm font-bold">
                        {(sub.displayName || sub.username)[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{sub.displayName || sub.username}</p>
                        <p className="text-xs text-muted">@{sub.username} · {sub.email}</p>
                      </div>
                      <Badge
                        variant={
                          sub.status === 'approved' ? 'success'
                            : sub.status === 'rejected' ? 'error'
                            : 'warning'
                        }
                        className="ml-auto"
                      >
                        {sub.status === 'pending' ? 'Pendente'
                          : sub.status === 'approved' ? 'Aprovado'
                          : 'Rejeitado'}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted mb-3">
                      Enviado em {new Date(sub.submittedAt).toLocaleString('pt-BR')}
                      {sub.reviewedAt && ` · Revisado em ${new Date(sub.reviewedAt).toLocaleString('pt-BR')}`}
                    </p>

                    {sub.rejectedReason && (
                      <div className="p-2 rounded bg-error/5 border border-error/20 mb-3">
                        <p className="text-xs text-error">Motivo: {sub.rejectedReason}</p>
                      </div>
                    )}

                    {/* Document thumbnails */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setPreviewImage(getMediaUrl(sub.documentFrontKey))}
                        className="relative aspect-[4/3] rounded-sm overflow-hidden border border-border hover:border-primary transition-colors group"
                      >
                        <img
                          src={getMediaUrl(sub.documentFrontKey)}
                          alt="Documento frente"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                        <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded">
                          Frente
                        </span>
                      </button>
                      <button
                        onClick={() => setPreviewImage(getMediaUrl(sub.documentBackKey))}
                        className="relative aspect-[4/3] rounded-sm overflow-hidden border border-border hover:border-primary transition-colors group"
                      >
                        <img
                          src={getMediaUrl(sub.documentBackKey)}
                          alt="Documento verso"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                        <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded">
                          Verso
                        </span>
                      </button>
                      <button
                        onClick={() => setPreviewImage(getMediaUrl(sub.selfieKey))}
                        className="relative aspect-[4/3] rounded-sm overflow-hidden border border-border hover:border-primary transition-colors group"
                      >
                        <img
                          src={getMediaUrl(sub.selfieKey)}
                          alt="Selfie"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                        <span className="absolute bottom-1 left-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded">
                          <Camera className="w-3 h-3 inline mr-0.5" />
                          Selfie
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  {sub.status === 'pending' && (
                    <div className="sm:w-48 flex flex-col gap-2">
                      {reviewingDoc?.id === sub.id ? (
                        <>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Motivo da rejeicao..."
                            rows={3}
                            className="w-full px-3 py-2 rounded-sm bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-error text-sm resize-none"
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleReject(sub)}
                            loading={reviewMutation.isPending}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Confirmar rejeicao
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setReviewingDoc(null); setRejectReason('') }}
                          >
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(sub)}
                            loading={reviewMutation.isPending}
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setReviewingDoc(sub)}
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-muted">Total: {total}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">Pagina {page}</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

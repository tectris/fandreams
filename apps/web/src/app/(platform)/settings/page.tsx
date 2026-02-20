'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateProfileSchema, type UpdateProfileInput } from '@fandreams/shared'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { StreakCounter } from '@/components/gamification/streak-counter'
import { LevelBadge } from '@/components/gamification/level-badge'
import { Settings, User, LogOut, KeyRound, Shield, CheckCircle2, Clock, XCircle, ArrowRight, Camera, ImagePlus, AlertTriangle, Trash2, ShieldCheck, X } from 'lucide-react'
import { toast } from 'sonner'
import { ImageEditor } from '@/components/image-editor'
import Link from 'next/link'

export default function SettingsPage() {
  const { user, logout, setUser } = useAuthStore()
  const queryClient = useQueryClient()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [editingAvatarFile, setEditingAvatarFile] = useState<File | null>(null)
  const [editingCoverFile, setEditingCoverFile] = useState<File | null>(null)

  const { data: profile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const res = await api.get<any>('/users/me')
      return res.data
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: profile ? { displayName: profile.displayName || '', bio: profile.bio || '' } : undefined,
  })

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileInput) => api.patch('/users/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      toast.success('Perfil atualizado!')
    },
    onError: (e: any) => toast.error(e.message),
  })

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const passwordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.patch('/users/me/password', data),
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const avatarMutation = useMutation({
    mutationFn: (file: File) => api.upload<{ url: string }>('/upload/avatar', file),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      if (user && res.data?.url) {
        setUser({ ...user, avatarUrl: res.data.url })
      }
      toast.success('Foto de perfil atualizada!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao enviar imagem'),
  })

  const coverMutation = useMutation({
    mutationFn: (file: File) => api.upload<{ url: string }>('/upload/cover', file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-profile'] })
      toast.success('Imagem de capa atualizada!')
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao enviar imagem'),
  })

  // Account management
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [accountPassword, setAccountPassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const deactivateMutation = useMutation({
    mutationFn: (password: string) => api.post('/users/me/deactivate', { password }),
    onSuccess: () => {
      toast.success('Conta desativada. Voce pode reativar fazendo login novamente.')
      setShowDeactivateDialog(false)
      setAccountPassword('')
      api.setToken(null)
      logout()
      window.location.href = '/'
    },
    onError: (e: any) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (password: string) => api.post('/users/me/delete', { password }),
    onSuccess: () => {
      toast.success('Exclusao agendada. Sua conta sera excluida em 30 dias.')
      setShowDeleteDialog(false)
      setAccountPassword('')
      setDeleteConfirmText('')
      api.setToken(null)
      logout()
      window.location.href = '/'
    },
    onError: (e: any) => toast.error(e.message),
  })

  // 2FA toggle
  const { data: settings } = useQuery({
    queryKey: ['my-settings'],
    queryFn: async () => {
      const res = await api.get<any>('/users/me/settings')
      return res.data
    },
  })

  const toggle2faMutation = useMutation({
    mutationFn: (enabled: boolean) => api.patch('/users/me/settings', { twoFactorEnabled: enabled }),
    onSuccess: (_res, enabled) => {
      queryClient.invalidateQueries({ queryKey: ['my-settings'] })
      toast.success(enabled ? 'Verificacao em duas etapas ativada!' : 'Verificacao em duas etapas desativada.')
    },
    onError: (e: any) => toast.error(e.message),
  })

  function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()
    if (deleteConfirmText !== 'EXCLUIR MINHA CONTA') {
      toast.error('Digite "EXCLUIR MINHA CONTA" para confirmar')
      return
    }
    if (!accountPassword) {
      toast.error('Senha obrigatoria')
      return
    }
    deleteMutation.mutate(accountPassword)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens sao aceitas')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem deve ter no maximo 5MB')
      return
    }
    setEditingAvatarFile(file)
    e.target.value = ''
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Apenas imagens sao aceitas')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Imagem deve ter no maximo 10MB')
      return
    }
    setEditingCoverFile(file)
    e.target.value = ''
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('As senhas nao coincidem')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Nova senha deve ter pelo menos 6 caracteres')
      return
    }
    passwordMutation.mutate({ currentPassword, newPassword })
  }

  function handleLogout() {
    api.setToken(null)
    logout()
    window.location.href = '/'
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Configuracoes</h1>
      </div>

      {/* Profile card with image uploads */}
      {profile && (
        <Card className="mb-6 overflow-hidden">
          {/* Cover image */}
          <div
            className="h-32 bg-gradient-to-br from-primary/30 to-secondary/30 relative group cursor-pointer"
            onClick={() => coverInputRef.current?.click()}
          >
            {profile.coverUrl && (
              <img src={profile.coverUrl} alt="" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-sm flex items-center gap-2">
                <ImagePlus className="w-5 h-5" />
                {coverMutation.isPending ? 'Enviando...' : 'Alterar capa'}
              </div>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverChange}
              className="hidden"
            />
          </div>
          <CardContent className="py-6">
            <div className="flex items-center gap-4 mb-4 -mt-12">
              {/* Avatar with upload */}
              <div
                className="relative group cursor-pointer shrink-0"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Avatar src={profile.avatarUrl} alt={profile.displayName || profile.username} size="xl" />
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
              <div className="pt-8">
                <h2 className="text-lg font-bold">{profile.displayName || profile.username}</h2>
                <p className="text-sm text-muted">@{profile.username}</p>
              </div>
            </div>
            {(avatarMutation.isPending || coverMutation.isPending) && (
              <p className="text-xs text-muted mb-2">Enviando imagem...</p>
            )}
            {profile.gamification && (
              <div className="flex items-center gap-6">
                <LevelBadge
                  level={profile.gamification.level}
                  tier={profile.gamification.fanTier}
                  xp={profile.gamification.xp}
                />
                <StreakCounter streak={profile.gamification.currentStreak} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* KYC verification status */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Verificacao de identidade
          </h2>
        </CardHeader>
        <CardContent>
          {user?.kycStatus === 'approved' ? (
            <div className="flex items-center gap-3 p-3 rounded-md bg-success/5 border border-success/20">
              <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              <div>
                <p className="text-sm font-medium text-success">Verificado</p>
                <p className="text-xs text-muted">Sua identidade foi verificada com sucesso</p>
              </div>
            </div>
          ) : user?.kycStatus === 'pending' ? (
            <div className="flex items-center gap-3 p-3 rounded-md bg-warning/5 border border-warning/20">
              <Clock className="w-5 h-5 text-warning shrink-0" />
              <div>
                <p className="text-sm font-medium text-warning">Em analise</p>
                <p className="text-xs text-muted">Seus documentos estao sendo analisados</p>
              </div>
            </div>
          ) : user?.kycStatus === 'rejected' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-md bg-error/5 border border-error/20">
                <XCircle className="w-5 h-5 text-error shrink-0" />
                <div>
                  <p className="text-sm font-medium text-error">Rejeitado</p>
                  <p className="text-xs text-muted">Sua verificacao foi rejeitada. Tente novamente com documentos mais claros.</p>
                </div>
              </div>
              <Link href="/kyc">
                <Button size="sm" className="w-full">
                  Tentar novamente
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Verifique sua identidade para poder postar imagens e videos na plataforma.
              </p>
              <Link href="/kyc">
                <Button size="sm">
                  <Shield className="w-4 h-4 mr-1" />
                  Iniciar verificacao
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Editar perfil
          </h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
            <Input
              id="displayName"
              label="Nome de exibicao"
              error={errors.displayName?.message}
              {...register('displayName')}
            />
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Bio</label>
              <textarea
                {...register('bio')}
                rows={3}
                className="w-full px-4 py-2.5 rounded-sm bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Conte um pouco sobre voce..."
              />
            </div>
            <Button type="submit" loading={updateMutation.isPending}>
              Salvar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            Alterar senha
          </h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input
              id="currentPassword"
              label="Senha atual"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              id="newPassword"
              label="Nova senha"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              id="confirmPassword"
              label="Confirmar nova senha"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button type="submit" loading={passwordMutation.isPending}>
              Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Legal */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Termos e Privacidade
          </h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/termos" className="flex items-center justify-between py-2 group">
            <span className="text-sm text-foreground group-hover:text-primary transition-colors">Termos de Uso</span>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
          </Link>
          <div className="border-t border-border" />
          <Link href="/privacidade" className="flex items-center justify-between py-2 group">
            <span className="text-sm text-foreground group-hover:text-primary transition-colors">Politica de Privacidade</span>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
          </Link>
          <div className="border-t border-border" />
          <Link href="/dmca" className="flex items-center justify-between py-2 group">
            <span className="text-sm text-foreground group-hover:text-primary transition-colors">DMCA</span>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
          </Link>
          <div className="border-t border-border" />
          <Link href="/compliance" className="flex items-center justify-between py-2 group">
            <span className="text-sm text-foreground group-hover:text-primary transition-colors">Compliance</span>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
          </Link>
        </CardContent>
      </Card>

      {/* 2FA */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Verificacao em duas etapas (2FA)
          </h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Codigo por email ao fazer login</p>
              <p className="text-xs text-muted mt-1">
                Receba um codigo de verificacao no seu email toda vez que fizer login
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings?.twoFactorEnabled || false}
              onClick={() => toggle2faMutation.mutate(!settings?.twoFactorEnabled)}
              disabled={toggle2faMutation.isPending}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                settings?.twoFactorEnabled ? 'bg-primary' : 'bg-border'
              } ${toggle2faMutation.isPending ? 'opacity-50' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings?.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Account Management */}
      <Card className="mb-6 border-error/20">
        <CardHeader>
          <h2 className="font-bold flex items-center gap-2 text-error">
            <AlertTriangle className="w-5 h-5" />
            Gerenciamento de conta
          </h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Deactivate account */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Desativar conta</p>
              <p className="text-xs text-muted mt-1">
                Sua conta ficara invisivel. Voce pode reativar a qualquer momento fazendo login.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                if (user?.role === 'admin') {
                  toast.error('Contas admin nao podem ser desativadas. Remova o papel de admin antes.')
                  return
                }
                setShowDeactivateDialog(true)
              }}
            >
              Desativar
            </Button>
          </div>

          <div className="border-t border-border" />

          {/* Delete account */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-error">Excluir conta permanentemente</p>
              <p className="text-xs text-muted mt-1">
                Sua conta sera excluida apos 30 dias. Durante este periodo voce pode cancelar fazendo login.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              className="shrink-0"
              onClick={() => {
                if (user?.role === 'admin') {
                  toast.error('Contas admin nao podem ser excluidas. Remova o papel de admin antes.')
                  return
                }
                setShowDeleteDialog(true)
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Excluir
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button variant="danger" className="w-full mb-6" onClick={handleLogout}>
        <LogOut className="w-4 h-4 mr-2" />
        Sair da conta
      </Button>

      {/* Deactivate Dialog */}
      {showDeactivateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeactivateDialog(false)} />
          <div className="relative bg-surface border border-border rounded-lg p-6 w-full max-w-md">
            <button
              onClick={() => { setShowDeactivateDialog(false); setAccountPassword('') }}
              className="absolute top-4 right-4 text-muted hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold mb-2">Desativar conta</h3>
            <p className="text-sm text-muted mb-4">
              Sua conta ficara invisivel para outros usuarios. Todas as suas assinaturas permanecem ativas.
              Voce pode reativar a qualquer momento fazendo login novamente.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!accountPassword) { toast.error('Senha obrigatoria'); return }
                deactivateMutation.mutate(accountPassword)
              }}
              className="space-y-4"
            >
              <Input
                id="deactivatePassword"
                label="Confirme sua senha"
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => { setShowDeactivateDialog(false); setAccountPassword('') }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1"
                  loading={deactivateMutation.isPending}
                >
                  Desativar conta
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteDialog(false)} />
          <div className="relative bg-surface border border-border rounded-lg p-6 w-full max-w-md">
            <button
              onClick={() => { setShowDeleteDialog(false); setAccountPassword(''); setDeleteConfirmText('') }}
              className="absolute top-4 right-4 text-muted hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-error mb-2">Excluir conta permanentemente</h3>
            <div className="p-3 rounded-md bg-error/5 border border-error/20 mb-4">
              <p className="text-sm text-error">
                Esta acao agendara a exclusao permanente da sua conta em 30 dias.
                Todos os seus dados, conteudos e assinaturas serao removidos.
              </p>
            </div>
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <Input
                id="deletePassword"
                label="Confirme sua senha"
                type="password"
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Digite <span className="font-bold text-error">EXCLUIR MINHA CONTA</span> para confirmar
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-sm bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-error"
                  placeholder="EXCLUIR MINHA CONTA"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={() => { setShowDeleteDialog(false); setAccountPassword(''); setDeleteConfirmText('') }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1"
                  loading={deleteMutation.isPending}
                  disabled={deleteConfirmText !== 'EXCLUIR MINHA CONTA'}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir conta
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Editor: Avatar */}
      {editingAvatarFile && (
        <ImageEditor
          file={editingAvatarFile}
          userTier={(profile?.gamification as any)?.fanTier || 'bronze'}
          creatorUsername={profile?.username}
          onSave={(editedFile) => {
            setEditingAvatarFile(null)
            avatarMutation.mutate(editedFile)
          }}
          onCancel={() => setEditingAvatarFile(null)}
        />
      )}

      {/* Image Editor: Cover */}
      {editingCoverFile && (
        <ImageEditor
          file={editingCoverFile}
          userTier={(profile?.gamification as any)?.fanTier || 'bronze'}
          creatorUsername={profile?.username}
          onSave={(editedFile) => {
            setEditingCoverFile(null)
            coverMutation.mutate(editedFile)
          }}
          onCancel={() => setEditingCoverFile(null)}
        />
      )}
    </div>
  )
}

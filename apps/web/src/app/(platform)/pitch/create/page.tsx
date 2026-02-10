'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InfoDrawer } from '@/components/ui/info-drawer'
import { Megaphone, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type RewardTier = { amount: string; title: string; description: string }

export default function CreateCampaignPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [goalAmount, setGoalAmount] = useState('')
  const [durationDays, setDurationDays] = useState('30')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([])

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/pitch/campaigns', data),
    onSuccess: (res: any) => {
      toast.success('Campanha criada com sucesso!')
      router.push(`/pitch/${res.data.id}`)
    },
    onError: (e: any) => toast.error(e.message),
  })

  function addTier() {
    if (rewardTiers.length >= 10) { toast.error('Maximo de 10 tiers'); return }
    setRewardTiers([...rewardTiers, { amount: '', title: '', description: '' }])
  }

  function updateTier(index: number, field: keyof RewardTier, value: string) {
    const updated = [...rewardTiers]
    updated[index] = { ...updated[index], [field]: value }
    setRewardTiers(updated)
  }

  function removeTier(index: number) {
    setRewardTiers(rewardTiers.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || title.length < 5) { toast.error('Titulo deve ter pelo menos 5 caracteres'); return }
    if (!description || description.length < 20) { toast.error('Descricao deve ter pelo menos 20 caracteres'); return }
    if (!goalAmount || Number(goalAmount) < 1000) { toast.error('Meta minima: 1.000 FanCoins'); return }

    const validTiers = rewardTiers
      .filter((t) => t.title && t.amount)
      .map((t) => ({ amount: Number(t.amount), title: t.title, description: t.description || t.title }))

    createMutation.mutate({
      title,
      description,
      category: category || undefined,
      goalAmount: Number(goalAmount),
      durationDays: Number(durationDays) || 30,
      coverImageUrl: coverImageUrl || undefined,
      rewardTiers: validTiers.length > 0 ? validTiers : undefined,
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/pitch" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Megaphone className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Criar Campanha</h1>
        <InfoDrawer title="Sobre Campanhas">
          <p>Crie uma campanha de crowdfunding para financiar seu projeto. Defina uma meta em FanCoins, um prazo e recompensas para seus apoiadores.</p>
          <p className="mt-2">Taxa da plataforma: 5% + 1% fundo ecossistema.</p>
          <p className="mt-2">Se a meta nao for atingida, todos sao reembolsados.</p>
        </InfoDrawer>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-bold">Informacoes da Campanha</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Titulo"
              placeholder="Ex: Ensaio fotografico exclusivo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              minLength={5}
              maxLength={200}
            />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Descricao</label>
              <textarea
                className="w-full px-4 py-2.5 rounded-sm bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200 min-h-[120px]"
                placeholder="Descreva seu projeto em detalhes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                minLength={20}
                maxLength={5000}
              />
            </div>

            <Input
              label="Categoria (opcional)"
              placeholder="Ex: Fotografia, Video, Musica"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={50}
            />

            <Input
              label="URL da capa (opcional)"
              type="url"
              placeholder="https://..."
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Meta (FanCoins)"
                type="number"
                placeholder="Min: 1.000"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                required
                min={1000}
                max={10000000}
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Duracao</label>
                <select
                  className="w-full px-4 py-2.5 rounded-sm bg-surface border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                >
                  <option value="7">7 dias</option>
                  <option value="14">14 dias</option>
                  <option value="30">30 dias</option>
                  <option value="60">60 dias</option>
                  <option value="90">90 dias</option>
                </select>
              </div>
            </div>

            {/* Reward Tiers */}
            <div className="border-t border-border pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm">Tiers de Recompensa (opcional)</h3>
                <Button type="button" size="sm" variant="outline" onClick={addTier}>
                  <Plus className="w-4 h-4 mr-1" /> Adicionar
                </Button>
              </div>

              {rewardTiers.map((tier, i) => (
                <div key={i} className="border border-border rounded-md p-3 mb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-medium">Tier {i + 1}</span>
                    <button type="button" onClick={() => removeTier(i)} className="text-error hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Titulo"
                      value={tier.title}
                      onChange={(e) => updateTier(i, 'title', e.target.value)}
                      maxLength={100}
                    />
                    <Input
                      placeholder="Valor minimo (FC)"
                      type="number"
                      value={tier.amount}
                      onChange={(e) => updateTier(i, 'amount', e.target.value)}
                      min={1}
                    />
                  </div>
                  <Input
                    placeholder="Descricao da recompensa"
                    value={tier.description}
                    onChange={(e) => updateTier(i, 'description', e.target.value)}
                    maxLength={500}
                  />
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full" loading={createMutation.isPending}>
              Criar Campanha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

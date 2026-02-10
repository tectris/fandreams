'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InfoDrawer } from '@/components/ui/info-drawer'
import { Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function CreateGuildPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [maxMembers, setMaxMembers] = useState('20')
  const [minCreatorScore, setMinCreatorScore] = useState('50')
  const [comboPrice, setComboPrice] = useState('')

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/guilds', data),
    onSuccess: (res: any) => {
      toast.success('Guilda criada com sucesso!')
      router.push(`/guilds/${res.data.id}`)
    },
    onError: (e: any) => toast.error(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || name.length < 3) { toast.error('Nome deve ter pelo menos 3 caracteres'); return }
    if (!slug || slug.length < 3) { toast.error('Slug deve ter pelo menos 3 caracteres'); return }

    createMutation.mutate({
      name,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      description: description || undefined,
      category: category || undefined,
      maxMembers: Number(maxMembers) || 20,
      minCreatorScore: Number(minCreatorScore) || 50,
      comboSubscriptionPrice: comboPrice ? Number(comboPrice) : undefined,
    })
  }

  function handleNameChange(value: string) {
    setName(value)
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) {
      setSlug(value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/guilds" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Criar Guilda</h1>
        <InfoDrawer title="Sobre Guildas">
          <p>Guildas sao grupos de criadores que trabalham juntos. Membros contribuem automaticamente uma porcentagem dos ganhos para o treasury coletivo.</p>
          <p className="mt-2">Ao criar uma guilda, voce se torna o lider e pode configurar requisitos de entrada, preco da assinatura combo e mais.</p>
        </InfoDrawer>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-bold">Informacoes da Guilda</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome da Guilda"
              placeholder="Ex: Elite Creators BR"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              minLength={3}
              maxLength={100}
            />

            <Input
              label="Slug (URL)"
              placeholder="elite-creators-br"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              required
              minLength={3}
              maxLength={100}
            />
            <p className="text-xs text-muted -mt-2">URL: /guilds/slug/{slug || '...'}</p>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Descricao</label>
              <textarea
                className="w-full px-4 py-2.5 rounded-sm bg-surface border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200 min-h-[80px]"
                placeholder="Descreva a missao da sua guilda..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
              />
            </div>

            <Input
              label="Categoria (opcional)"
              placeholder="Ex: Gaming, Fitness, Lifestyle"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={50}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Max. membros"
                type="number"
                value={maxMembers}
                onChange={(e) => setMaxMembers(e.target.value)}
                min={2}
                max={100}
              />
              <Input
                label="Creator Score minimo"
                type="number"
                value={minCreatorScore}
                onChange={(e) => setMinCreatorScore(e.target.value)}
                min={0}
                max={100}
              />
            </div>

            <Input
              label="Preco assinatura combo (R$, opcional)"
              type="number"
              placeholder="Ex: 29.90"
              value={comboPrice}
              onChange={(e) => setComboPrice(e.target.value)}
              step="0.01"
              min={10}
            />
            <p className="text-xs text-muted -mt-2">Se preenchido, fas poderao assinar todos os membros da guilda por este valor mensal.</p>

            <Button type="submit" className="w-full" loading={createMutation.isPending}>
              Criar Guilda
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

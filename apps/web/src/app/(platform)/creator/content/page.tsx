'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPostSchema, type CreatePostInput } from '@myfans/shared'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ImagePlus, Video, Send, Eye, Lock, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

export default function CreateContentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { visibility: 'subscribers', postType: 'regular' },
  })

  const visibility = watch('visibility')

  async function onSubmit(data: CreatePostInput) {
    setLoading(true)
    try {
      await api.post('/posts', data)
      toast.success('Post publicado!')
      router.push('/feed')
    } catch (e: any) {
      toast.error(e.message || 'Erro ao publicar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-6">Novo post</h1>

      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <textarea
                {...register('contentText')}
                placeholder="O que voce quer compartilhar?"
                rows={5}
                className="w-full px-4 py-3 rounded-sm bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>

            {/* Media upload buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-sm border border-border text-sm text-muted hover:text-foreground hover:border-primary transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
                Imagem
              </button>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 rounded-sm border border-border text-sm text-muted hover:text-foreground hover:border-primary transition-colors"
              >
                <Video className="w-4 h-4" />
                Video
              </button>
            </div>

            {/* Visibility */}
            <div>
              <label className="block text-sm font-medium mb-2">Visibilidade</label>
              <div className="flex gap-2">
                {[
                  { value: 'public', icon: Eye, label: 'Publico' },
                  { value: 'subscribers', icon: Lock, label: 'Assinantes' },
                  { value: 'ppv', icon: DollarSign, label: 'Pago (PPV)' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 px-4 py-2 rounded-sm border text-sm cursor-pointer transition-colors ${
                      visibility === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      value={opt.value}
                      {...register('visibility')}
                      className="hidden"
                    />
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {visibility === 'ppv' && (
              <Input
                id="ppvPrice"
                label="Preco do conteudo (R$)"
                type="number"
                step="0.01"
                min="1"
                placeholder="29.90"
                error={errors.ppvPrice?.message}
                {...register('ppvPrice', { valueAsNumber: true })}
              />
            )}

            <Button type="submit" className="w-full" loading={loading}>
              <Send className="w-4 h-4 mr-1" />
              Publicar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginInput } from '@fandreams/shared'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Flame, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const setUser = useAuthStore((s) => s.setUser)
  const [loading, setLoading] = useState(false)

  // 2FA state
  const [show2fa, setShow2fa] = useState(false)
  const [challengeToken, setChallengeToken] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginInput) {
    setLoading(true)
    try {
      const res = await api.post<any>('/auth/login', data)

      if (res.data.requires2fa) {
        setChallengeToken(res.data.challengeToken)
        setMaskedEmail(res.data.user.email)
        setShow2fa(true)
        setLoading(false)
        return
      }

      api.setToken(res.data.accessToken)
      localStorage.setItem('refreshToken', res.data.refreshToken)
      setUser(res.data.user)
      if (res.data.user.reactivated) {
        toast.success('Conta reativada! Bem-vindo de volta!')
      } else {
        toast.success('Bem-vindo de volta!')
      }
      router.push('/feed')
    } catch (e: any) {
      toast.error(e.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const newDigits = [...otpDigits]
    newDigits[index] = value.slice(-1)
    setOtpDigits(newDigits)

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  async function handleVerify2fa() {
    const code = otpDigits.join('')
    if (code.length !== 6) {
      toast.error('Digite o codigo completo de 6 digitos')
      return
    }

    setLoading(true)
    try {
      const res = await api.post<any>('/auth/verify-2fa', { challengeToken, code })
      api.setToken(res.data.accessToken)
      localStorage.setItem('refreshToken', res.data.refreshToken)
      setUser(res.data.user)
      toast.success('Bem-vindo de volta!')
      router.push('/feed')
    } catch (e: any) {
      toast.error(e.message || 'Codigo invalido')
      setOtpDigits(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  if (show2fa) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl">
              <Flame className="w-8 h-8 text-primary" />
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">FanDreams</span>
            </Link>
            <p className="text-muted text-sm mt-2">Verificacao em duas etapas</p>
          </div>

          <div className="text-center mb-6">
            <p className="text-sm text-foreground mb-1">
              Enviamos um codigo de verificacao para
            </p>
            <p className="text-sm font-medium text-primary">{maskedEmail}</p>
          </div>

          <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
            {otpDigits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                autoFocus={i === 0}
                className="w-12 h-14 text-center text-xl font-bold rounded-lg bg-surface-light border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ))}
          </div>

          <Button
            className="w-full mb-4"
            loading={loading}
            onClick={handleVerify2fa}
            disabled={otpDigits.join('').length !== 6}
          >
            Verificar
          </Button>

          <button
            type="button"
            onClick={() => { setShow2fa(false); setOtpDigits(['', '', '', '', '', '']); setChallengeToken('') }}
            className="flex items-center gap-1 text-sm text-muted hover:text-foreground mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl">
            <Flame className="w-8 h-8 text-primary" />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">FanDreams</span>
          </Link>
          <p className="text-muted text-sm mt-2">Entre na sua conta</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="seu@email.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            id="password"
            label="Senha"
            type="password"
            placeholder="Sua senha"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Esqueceu a senha?
            </Link>
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            Entrar
          </Button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Nao tem uma conta?{' '}
          <Link href="/register" className="text-primary hover:underline font-medium">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}

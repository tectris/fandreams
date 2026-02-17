import type { Metadata, Viewport } from 'next'
import { Providers } from '@/lib/providers'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://www.fandreams.app'),
  title: { default: 'FanDreams — Seu conteudo. Suas regras.', template: '%s | FanDreams' },
  description:
    'Monetize seu conteudo com a menor taxa do mercado. 85% para o criador, saque seguro via PIX e Crypto.',
  keywords: ['criadores', 'monetizacao', 'conteudo', 'assinatura', 'fancoins', 'pix'],
  openGraph: {
    siteName: 'FanDreams',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0F0F0F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

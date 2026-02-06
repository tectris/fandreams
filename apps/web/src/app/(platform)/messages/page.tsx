'use client'

import { Card, CardContent } from '@/components/ui/card'
import { MessageCircle } from 'lucide-react'

export default function MessagesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Mensagens</h1>
      </div>

      <Card>
        <CardContent className="py-16 text-center">
          <MessageCircle className="w-16 h-16 text-muted mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Nenhuma mensagem ainda</h2>
          <p className="text-sm text-muted">
            Suas conversas com criadores aparecerão aqui
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { timeAgo } from '@/lib/utils'
import { MessageCircle, Send, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface OtherParticipant {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

interface Conversation {
  id: string
  participant1: string
  participant2: string
  lastMessageAt: string | null
  lastMessagePreview: string | null
  isLocked: boolean
  otherParticipant: OtherParticipant | null
  unreadCount: number
}

interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  content: string | null
  mediaUrl: string | null
  mediaType: string | null
  isRead: boolean
  createdAt: string
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
      <MessagesContent />
    </Suspense>
  )
}

function MessagesContent() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [startedConv, setStartedConv] = useState(false)

  const recipientId = searchParams.get('to')

  // Fetch conversations
  const { data: conversations, isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get<Conversation[]>('/messages/conversations')
      return res.data || []
    },
  })

  // Auto-start conversation from ?to= param
  const startConvMutation = useMutation({
    mutationFn: (rid: string) =>
      api.post<Conversation>('/messages/conversations', { recipientId: rid }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      if (res.data) {
        setActiveConversation(res.data.id)
      }
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao iniciar conversa'),
  })

  useEffect(() => {
    if (recipientId && conversations && !startedConv) {
      setStartedConv(true)
      const existing = conversations.find(
        (c) => c.otherParticipant?.id === recipientId,
      )
      if (existing) {
        setActiveConversation(existing.id)
      } else {
        startConvMutation.mutate(recipientId)
      }
    }
  }, [recipientId, conversations, startedConv])

  // Fetch messages for active conversation
  const { data: messagesData } = useQuery({
    queryKey: ['messages', activeConversation],
    queryFn: async () => {
      const res = await api.get<ChatMessage[]>(
        `/messages/conversations/${activeConversation}/messages`,
      )
      return res.data || []
    },
    enabled: !!activeConversation,
    refetchInterval: 5000,
  })

  // Mark as read when viewing
  useEffect(() => {
    if (activeConversation) {
      api.patch(`/messages/conversations/${activeConversation}/read`).catch(() => {})
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  }, [activeConversation, messagesData])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesData])

  // Send message
  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/messages/conversations/${activeConversation}/messages`, { content }),
    onSuccess: () => {
      setMessageInput('')
      queryClient.invalidateQueries({ queryKey: ['messages', activeConversation] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      inputRef.current?.focus()
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao enviar mensagem'),
  })

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = messageInput.trim()
    if (!text || !activeConversation) return
    sendMutation.mutate(text)
  }

  const activeConv = conversations?.find((c) => c.id === activeConversation)
  const showChat = !!activeConversation

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold">Mensagens</h1>
      </div>

      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Conversation list */}
        <div
          className={`w-full md:w-80 md:shrink-0 ${
            showChat ? 'hidden md:block' : 'block'
          }`}
        >
          <Card className="h-full flex flex-col">
            <CardContent className="p-0 flex-1 overflow-y-auto">
              {loadingConversations ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-light" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-surface-light rounded w-2/3" />
                        <div className="h-3 bg-surface-light rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations && conversations.length > 0 ? (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversation(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-light transition-colors text-left border-b border-border last:border-0 ${
                      activeConversation === conv.id ? 'bg-primary/5' : ''
                    }`}
                  >
                    <Avatar
                      src={conv.otherParticipant?.avatarUrl}
                      alt={
                        conv.otherParticipant?.displayName ||
                        conv.otherParticipant?.username ||
                        ''
                      }
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">
                          {conv.otherParticipant?.displayName ||
                            conv.otherParticipant?.username ||
                            'Usuario'}
                        </span>
                        {conv.lastMessageAt && (
                          <span className="text-xs text-muted shrink-0 ml-2">
                            {timeAgo(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted truncate">
                          {conv.lastMessagePreview || 'Sem mensagens'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 shrink-0 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-muted mx-auto mb-3" />
                  <p className="text-sm text-muted">Nenhuma conversa ainda</p>
                  <p className="text-xs text-muted mt-1">
                    Acesse o perfil de um criador para enviar uma mensagem
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat area */}
        <div className={`flex-1 ${showChat ? 'block' : 'hidden md:block'}`}>
          {activeConversation && activeConv ? (
            <Card className="h-full flex flex-col">
              {/* Chat header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <button
                  onClick={() => setActiveConversation(null)}
                  className="md:hidden p-1 rounded-sm hover:bg-surface-light"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <Avatar
                  src={activeConv.otherParticipant?.avatarUrl}
                  alt={
                    activeConv.otherParticipant?.displayName ||
                    activeConv.otherParticipant?.username ||
                    ''
                  }
                  size="sm"
                />
                <div>
                  <p className="font-medium text-sm">
                    {activeConv.otherParticipant?.displayName ||
                      activeConv.otherParticipant?.username}
                  </p>
                  <p className="text-xs text-muted">
                    @{activeConv.otherParticipant?.username}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messagesData && messagesData.length > 0 ? (
                  messagesData.map((msg) => {
                    const isMe = msg.senderId === user?.id
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                            isMe
                              ? 'bg-primary text-white rounded-br-sm'
                              : 'bg-surface-light text-foreground rounded-bl-sm'
                          }`}
                        >
                          {msg.mediaUrl && (
                            <img
                              src={msg.mediaUrl}
                              alt=""
                              className="rounded-lg mb-2 max-w-full"
                            />
                          )}
                          {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                          <p
                            className={`text-[10px] mt-1 ${
                              isMe ? 'text-white/60' : 'text-muted'
                            }`}
                          >
                            {timeAgo(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted">
                      Envie uma mensagem para iniciar a conversa
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 px-4 py-3 border-t border-border"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-4 py-2.5 rounded-full bg-surface-light border border-border text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!messageInput.trim() || sendMutation.isPending}
                  className="rounded-full w-10 h-10 p-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </Card>
          ) : (
            <Card className="h-full hidden md:flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-muted mx-auto mb-4" />
                <p className="text-muted">Selecione uma conversa</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

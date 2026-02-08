import { eq, and, or, desc, sql, asc } from 'drizzle-orm'
import { conversations, messages, users, creatorProfiles } from '@fandreams/database'
import { db } from '../config/database'
import { AppError } from './auth.service'

export async function getConversations(userId: string) {
  const rows = await db
    .select({
      id: conversations.id,
      participant1: conversations.participant1,
      participant2: conversations.participant2,
      lastMessageAt: conversations.lastMessageAt,
      lastMessagePreview: conversations.lastMessagePreview,
      isLocked: conversations.isLocked,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .where(
      or(
        eq(conversations.participant1, userId),
        eq(conversations.participant2, userId),
      ),
    )
    .orderBy(desc(conversations.lastMessageAt))

  // Enrich with the other participant's info
  const enriched = await Promise.all(
    rows.map(async (conv) => {
      const otherId = conv.participant1 === userId ? conv.participant2 : conv.participant1
      const [other] = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, otherId))
        .limit(1)

      // Count unread messages
      const [unread] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conv.id),
            eq(messages.isRead, false),
            sql`${messages.senderId} != ${userId}`,
          ),
        )

      return {
        ...conv,
        otherParticipant: other || null,
        unreadCount: unread?.count || 0,
      }
    }),
  )

  return enriched
}

export async function getOrCreateConversation(userId: string, recipientId: string) {
  if (userId === recipientId) {
    throw new AppError('INVALID', 'Voce nao pode iniciar conversa consigo mesmo', 400)
  }

  // Check if recipient exists
  const [recipient] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, recipientId))
    .limit(1)

  if (!recipient) {
    throw new AppError('NOT_FOUND', 'Usuario nao encontrado', 404)
  }

  // Check if creator has messages enabled
  if (recipient.role === 'creator' || recipient.role === 'admin') {
    const [profile] = await db
      .select({ messagesEnabled: creatorProfiles.messagesEnabled })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.userId, recipientId))
      .limit(1)

    if (profile && !profile.messagesEnabled) {
      throw new AppError('MESSAGES_DISABLED', 'Este criador nao esta aceitando mensagens', 403)
    }
  }

  // Check both orderings (participant1/participant2 pair)
  const [existing] = await db
    .select()
    .from(conversations)
    .where(
      or(
        and(
          eq(conversations.participant1, userId),
          eq(conversations.participant2, recipientId),
        ),
        and(
          eq(conversations.participant1, recipientId),
          eq(conversations.participant2, userId),
        ),
      ),
    )
    .limit(1)

  if (existing) return existing

  const [conv] = await db
    .insert(conversations)
    .values({
      participant1: userId,
      participant2: recipientId,
    })
    .returning()

  return conv
}

export async function getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
  // Verify user is participant
  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        or(
          eq(conversations.participant1, userId),
          eq(conversations.participant2, userId),
        ),
      ),
    )
    .limit(1)

  if (!conv) {
    throw new AppError('NOT_FOUND', 'Conversa nao encontrada', 404)
  }

  const offset = (page - 1) * limit

  const msgs = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      content: messages.content,
      mediaUrl: messages.mediaUrl,
      mediaType: messages.mediaType,
      isPpv: messages.isPpv,
      ppvPrice: messages.ppvPrice,
      isRead: messages.isRead,
      readAt: messages.readAt,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .offset(offset)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))

  return { messages: msgs.reverse(), total: count || 0 }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  data: { content?: string; mediaUrl?: string; mediaType?: string },
) {
  // Verify sender is participant
  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        or(
          eq(conversations.participant1, senderId),
          eq(conversations.participant2, senderId),
        ),
      ),
    )
    .limit(1)

  if (!conv) {
    throw new AppError('NOT_FOUND', 'Conversa nao encontrada', 404)
  }

  if (!data.content && !data.mediaUrl) {
    throw new AppError('INVALID', 'Mensagem deve ter conteudo ou midia', 400)
  }

  const [msg] = await db
    .insert(messages)
    .values({
      conversationId,
      senderId,
      content: data.content || null,
      mediaUrl: data.mediaUrl || null,
      mediaType: data.mediaType || null,
    })
    .returning()

  // Update conversation last message
  const preview = data.content
    ? data.content.substring(0, 100)
    : data.mediaType === 'video' ? 'Video' : 'Imagem'

  await db
    .update(conversations)
    .set({
      lastMessageAt: new Date(),
      lastMessagePreview: preview,
    })
    .where(eq(conversations.id, conversationId))

  return msg
}

export async function markAsRead(conversationId: string, userId: string) {
  // Verify user is participant
  const [conv] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        or(
          eq(conversations.participant1, userId),
          eq(conversations.participant2, userId),
        ),
      ),
    )
    .limit(1)

  if (!conv) {
    throw new AppError('NOT_FOUND', 'Conversa nao encontrada', 404)
  }

  await db
    .update(messages)
    .set({ isRead: true, readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        eq(messages.isRead, false),
        sql`${messages.senderId} != ${userId}`,
      ),
    )

  return { success: true }
}

export async function getUnreadCount(userId: string) {
  // Get all conversations this user is part of
  const convIds = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      or(
        eq(conversations.participant1, userId),
        eq(conversations.participant2, userId),
      ),
    )

  if (convIds.length === 0) return { count: 0 }

  const ids = convIds.map((c) => c.id)

  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(
      and(
        sql`${messages.conversationId} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`,
        eq(messages.isRead, false),
        sql`${messages.senderId} != ${userId}`,
      ),
    )

  return { count: result?.count || 0 }
}

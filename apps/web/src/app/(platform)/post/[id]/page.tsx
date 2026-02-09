import type { Metadata } from 'next'
import PostDetailContent from './post-detail-content'

const API_URL = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const normalized = raw.match(/^https?:\/\//) ? raw : `https://${raw}`
  // Strip /api/v1 suffix if present (same logic as client api.ts), then re-add it
  return normalized.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')
})()

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

type Props = {
  params: Promise<{ id: string }>
}

async function fetchPostForMeta(code: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/posts/${code}`, {
      next: { revalidate: 60 },
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data || null
  } catch {
    return null
  }
}

function getOgImage(post: any): string | null {
  if (!post.media || post.media.length === 0) return null

  // For non-public posts, only use preview media to avoid leaking paid content
  if (post.visibility !== 'public') {
    const preview = post.media.find((m: any) => m.isPreview && m.storageKey)
    if (preview) {
      return preview.mediaType === 'video' ? preview.thumbnailUrl : preview.storageKey
    }
    return null
  }

  const first = post.media[0]
  if (first.mediaType === 'image' && first.storageKey) return first.storageKey
  if (first.mediaType === 'video' && first.thumbnailUrl) return first.thumbnailUrl
  return null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const post = await fetchPostForMeta(id)

  if (!post) {
    return {
      title: 'Post nao encontrado',
      description: 'Este post pode ter sido removido ou nao existe.',
    }
  }

  const creatorName = post.creator?.displayName || post.creator?.username || 'Criador'
  const title = `${creatorName} no FanDreams`
  const description = post.contentText
    ? post.contentText.substring(0, 160)
    : `Confira este post de ${creatorName} no FanDreams`
  const postUrl = `${APP_URL}/post/${post.shortCode || id}`
  const ogImage = getOgImage(post)

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: postUrl,
      siteName: 'FanDreams',
      type: 'article',
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  }
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params
  return <PostDetailContent postCode={id} />
}

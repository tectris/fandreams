import type { Metadata } from 'next'
import { headers } from 'next/headers'
import PostDetailContent from './post-detail-content'

const API_URL = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const normalized = raw.match(/^https?:\/\//) ? raw : `https://${raw}`
  return normalized.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')
})()

type Props = {
  params: Promise<{ id: string }>
}

async function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  try {
    const headersList = await headers()
    const host = headersList.get('x-forwarded-host') || headersList.get('host')
    if (host) {
      const protocol = headersList.get('x-forwarded-proto') || 'https'
      return `${protocol}://${host}`
    }
  } catch {}
  return 'https://www.fandreams.app'
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const [post, baseUrl] = await Promise.all([fetchPostForMeta(id), getBaseUrl()])

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
  const shortCode = post.shortCode || id
  const postUrl = `${baseUrl}/post/${shortCode}`

  // Prefer a direct media URL (fast, served from CDN) over dynamic image generation
  let ogImageUrl: string | null = null
  if (post.media && post.media.length > 0) {
    const first = post.media[0]
    // thumbnailUrl is always available (never redacted), good for videos and PPV content
    // storageKey is available for public posts / preview images
    ogImageUrl = first.thumbnailUrl || first.storageKey || null
  }
  // Fallback to dynamic OG image route for text-only posts or when no direct URL
  if (!ogImageUrl) {
    ogImageUrl = `${baseUrl}/api/og/${shortCode}`
  }

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      url: postUrl,
      siteName: 'FanDreams',
      type: 'article',
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: `Post de ${creatorName}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: ogImageUrl, alt: `Post de ${creatorName}` }],
    },
  }
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params
  return <PostDetailContent postCode={id} />
}

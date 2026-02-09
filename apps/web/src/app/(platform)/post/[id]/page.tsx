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
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'www.fandreams.app'
  const protocol = headersList.get('x-forwarded-proto') || 'https'
  return `${protocol}://${host}`
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

  // Override metadataBase so og:image URLs resolve to the actual domain, not localhost
  const metadataBase = new URL(baseUrl)

  if (!post) {
    return {
      metadataBase,
      title: 'Post nao encontrado',
      description: 'Este post pode ter sido removido ou nao existe.',
    }
  }

  const creatorName = post.creator?.displayName || post.creator?.username || 'Criador'
  const title = `${creatorName} no FanDreams`
  const description = post.contentText
    ? post.contentText.substring(0, 160)
    : `Confira este post de ${creatorName} no FanDreams`
  const postUrl = `${baseUrl}/post/${post.shortCode || id}`

  return {
    metadataBase,
    title,
    description,
    openGraph: {
      title,
      description,
      url: postUrl,
      siteName: 'FanDreams',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params
  return <PostDetailContent postCode={id} />
}

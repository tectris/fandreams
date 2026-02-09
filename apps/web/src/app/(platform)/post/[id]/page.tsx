import type { Metadata } from 'next'
import PostDetailContent from './post-detail-content'

const API_URL = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const normalized = raw.match(/^https?:\/\//) ? raw : `https://${raw}`
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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: postUrl,
      siteName: 'FanDreams',
      type: 'article',
      // og:image is handled by opengraph-image.tsx convention file
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      // twitter:image is handled by opengraph-image.tsx convention file
    },
  }
}

export default async function PostDetailPage({ params }: Props) {
  const { id } = await params
  return <PostDetailContent postCode={id} />
}

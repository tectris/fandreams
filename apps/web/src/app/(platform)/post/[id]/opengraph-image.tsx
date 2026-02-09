import { ImageResponse } from 'next/og'

export const alt = 'Preview do post no FanDreams'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const API_URL = (() => {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const normalized = raw.match(/^https?:\/\//) ? raw : `https://${raw}`
  return normalized.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '')
})()

async function fetchPost(code: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/posts/${code}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.data || null
  } catch {
    return null
  }
}

function getThumbnailUrl(post: any): string | null {
  if (post.media && post.media.length > 0) {
    const first = post.media[0]
    if (first.thumbnailUrl) return first.thumbnailUrl
    if (first.mediaType === 'image' && first.storageKey) return first.storageKey
  }
  return null
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await fetchPost(id)

  const creatorName = post?.creator?.displayName || post?.creator?.username || 'Criador'
  const postText = post?.contentText || ''
  const truncatedText = postText.length > 120 ? postText.substring(0, 120) + '...' : postText
  const thumbnailUrl = post ? getThumbnailUrl(post) : null
  const hasVideo = post?.media?.[0]?.mediaType === 'video'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          backgroundColor: '#0F0F0F',
          position: 'relative',
        }}
      >
        {/* Background thumbnail if available */}
        {thumbnailUrl && (
          <img
            src={thumbnailUrl}
            alt=""
            width={1200}
            height={630}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.35,
              filter: 'blur(8px)',
            }}
          />
        )}

        {/* Main content area */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* Left: Thumbnail preview */}
          {thumbnailUrl && (
            <div
              style={{
                display: 'flex',
                width: '50%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  position: 'relative',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  maxWidth: '480px',
                  maxHeight: '480px',
                }}
              >
                <img
                  src={thumbnailUrl}
                  alt=""
                  width={480}
                  height={480}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* Play button overlay for videos */}
                {hasVideo && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderTop: '16px solid transparent',
                        borderBottom: '16px solid transparent',
                        borderLeft: '28px solid white',
                        marginLeft: '4px',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right: Text info */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '50px',
              width: thumbnailUrl ? '50%' : '100%',
              gap: '20px',
            }}
          >
            {/* Creator name */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              {post?.creator?.avatarUrl && (
                <img
                  src={post.creator.avatarUrl}
                  alt=""
                  width={56}
                  height={56}
                  style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              )}
              <span
                style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                }}
              >
                {creatorName}
              </span>
            </div>

            {/* Post text */}
            {truncatedText && (
              <p
                style={{
                  fontSize: '24px',
                  color: '#CCCCCC',
                  lineHeight: 1.4,
                  margin: 0,
                }}
              >
                {truncatedText}
              </p>
            )}

            {/* FanDreams branding */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginTop: '20px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: 'white', fontSize: '20px', fontWeight: 800 }}>F</span>
              </div>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 600,
                  color: '#888888',
                }}
              >
                FanDreams
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  )
}

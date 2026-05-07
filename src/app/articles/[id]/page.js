import { articleDb } from '@/lib/db'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'
import ArticleImageGroup from '../ArticleImageGroup'

export const dynamic = 'force-dynamic'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '날짜 정보 없음'
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

async function resolveGoogleMapsLinks(content) {
  const shortUrlRegex = /https:\/\/maps\.app\.goo\.gl\/[a-zA-Z0-9]+/g;
  const matches = content.match(shortUrlRegex);
  
  if (!matches) return content;

  let resolvedContent = content;
  // 중복된 링크는 한 번만 해결하도록 필터링
  const uniqueMatches = [...new Set(matches)];

  const results = await Promise.all(
    uniqueMatches.map(async (url) => {
      try {
        const res = await fetch(url, { redirect: 'follow' });
        return { shortUrl: url, fullUrl: res.url };
      } catch (err) {
        console.error('맵 주소 변환 실패:', url, err);
        return { shortUrl: url, fullUrl: url };
      }
    })
  );

  results.forEach(({ shortUrl, fullUrl }) => {
    // 본문의 모든 해당 단축 주소를 정식 주소로 치환
    resolvedContent = resolvedContent.split(shortUrl).join(fullUrl);
  });

  return resolvedContent;
}

export default async function ArticleDetailPage({ params }) {
  const { id } = await params
  const article = await articleDb.findOne(parseInt(id))

  if (!article) {
    notFound()
  }

  // 본문 렌더링 전 단축 주소 해결 (v1.1.2)
  const resolvedContent = await resolveGoogleMapsLinks(article.content);


  return (
    <article className="article-detail-container">
      <header className="article-detail-header">
        <Link href="/articles" className="hero-label">← Back to Articles</Link>
        <h1 className="article-detail-title">{article.title}</h1>
        <div className="article-detail-meta">
          <span className="detail-category">{article.category || '잡담'}</span>
          <span className="divider">|</span>
          <span>{formatDate(article.createdAt)}</span>
        </div>
      </header>


      <div className="article-detail-content prose">
        <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              // 링크 오버라이드 (v1.1.5: 주소가 구글 맵/유튜브일 경우 임베드로 변환)
              a: ({ href, children }) => {
                const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s]*)$/;
                const googleMapsRegex = /google\.[a-z.]+\/maps\/(?:place|search)\/([^/?]+)/;
                
                // 1. 유튜브 감지
                const ytMatch = href?.match(youtubeRegex);
                if (ytMatch) {
                  const videoId = ytMatch[1];
                  return (
                    <div className="video-container">
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </div>
                  );
                }

                // 2. 구글 맵 감지
                const gmMatch = href?.match(googleMapsRegex);
                if (gmMatch) {
                  const placeName = decodeURIComponent(gmMatch[1].replace(/\+/g, ' '));
                  return (
                    <span className="map-card-wrapper" style={{ display: 'block', textDecoration: 'none' }}>
                      <a href={href} target="_blank" rel="noopener noreferrer" className="map-card">
                        <div className="map-card-header">
                          <span className="map-card-icon">📍</span>
                          <h4 className="map-card-title">{placeName}</h4>
                        </div>
                        <div className="map-card-body">
                          <iframe
                            src={`https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                            title="Google Maps"
                            allowFullScreen
                          ></iframe>
                        </div>
                      </a>
                    </span>
                  );
                }
                return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
              },
              // 유튜브 및 구글 맵 텍스트 자동 임베드
              p: ({ children }) => {
                try {
                  const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[^\s]*)$/;
                  const googleMapsRegex = /google\.[a-z.]+\/maps\/(?:place|search)\/([^/?]+)/;
                  
                  if (children && children.length === 1 && typeof children[0] === 'string') {
                    const text = children[0].trim();
                    
                    // 1. 유튜브 감지
                    const ytMatch = text.match(youtubeRegex);
                    if (ytMatch) {
                      const videoId = ytMatch[1];
                      return (
                        <div className="video-container">
                          <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      );
                    }

                    // 2. 구글 맵 감지 (v1.1.5 카드 UI 적용)
                    const gmMatch = text.match(googleMapsRegex);
                    if (gmMatch) {
                      const placeName = decodeURIComponent(gmMatch[1].replace(/\+/g, ' '));
                      return (
                        <a href={text} target="_blank" rel="noopener noreferrer" className="map-card">
                          <div className="map-card-header">
                            <span className="map-card-icon">📍</span>
                            <h4 className="map-card-title">{placeName}</h4>
                          </div>
                          <div className="map-card-body">
                            <iframe
                              src={`https://maps.google.com/maps?q=${encodeURIComponent(placeName)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                              title="Google Maps"
                              allowFullScreen
                            ></iframe>
                          </div>
                        </a>
                      );
                    }
                  }
                } catch (err) {
                  console.error('본문 렌더링 중 오류 발생:', err);
                }
                return <p>{children}</p>;
              },
              img: ({node, alt, src, ...props}) => {
                if ((alt === 'SLIDER' || alt === 'COLLAGE') && src) {
                  const urls = src.split(',').filter(u => u.trim()).map(u => u.trim())
                  if (urls.length > 0) {
                    return <ArticleImageGroup type={alt} urls={urls} />
                  }
                }
                return <img {...props} alt={alt} src={src} style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '3rem auto', borderRadius: 'var(--radius)' }} />
              }
            }}
        >
          {resolvedContent}
        </ReactMarkdown>
      </div>


      <footer style={{ marginTop: '8rem', borderTop: '1px solid var(--border)', paddingTop: '4rem', textAlign: 'center' }}>
        <Link href="/articles" className="btn btn-ghost">목록으로 돌아가기</Link>
      </footer>
    </article>
  )
}

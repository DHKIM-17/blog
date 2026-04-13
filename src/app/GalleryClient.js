'use client'

import { useState } from 'react'
import Link from 'next/link'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '날짜 정보 없음'
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function GalleryClient({ photos }) {
  const [selected, setSelected] = useState(null)

  // Keyboard navigation
  require('react').useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selected) return
      if (e.key === 'ArrowLeft') {
        const idx = photos.findIndex(p => p.id === selected.id)
        const prevIdx = (idx - 1 + photos.length) % photos.length
        setSelected(photos[prevIdx])
      } else if (e.key === 'ArrowRight') {
        const idx = photos.findIndex(p => p.id === selected.id)
        const nextIdx = (idx + 1) % photos.length
        setSelected(photos[nextIdx])
      } else if (e.key === 'Escape') {
        setSelected(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selected, photos])

  return (
    <>
      <header className="hero">
        <p className="hero-label">Photo Storage</p>
        <h1 className="hero-title">The photos I took</h1>
      </header>

      {/* Gallery */}
      <main className="gallery-section">
        {photos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⬡</div>
            <h3>아직 사진이 없습니다</h3>
            <p>관리자 페이지에서 첫 번째 사진을 업로드해 보세요.</p>
          </div>
        ) : (
          <div className="gallery-grid">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="photo-card"
                onClick={() => setSelected(photo)}
                role="button"
                tabIndex={0}
                aria-label={`사진 보기: ${photo.title || '제목 없음'}`}
                onKeyDown={(e) => e.key === 'Enter' && setSelected(photo)}
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.title || '사진'}
                  loading="lazy"
                />
                <div className="photo-card-overlay">
                  <div className="photo-card-info">
                    {photo.title && (
                      <div className="photo-card-title">{photo.title}</div>
                    )}
                    <div className="photo-card-date">{formatDate(photo.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {selected && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-content">
            <button
              className="modal-close"
              onClick={() => setSelected(null)}
              aria-label="닫기"
            >
              ×
            </button>

            <div className="modal-image">
              {/* Navigation Arrows */}
              {photos.length > 1 && (
                <>
                  <button 
                    className="modal-nav-btn prev" 
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = photos.findIndex(p => p.id === selected.id);
                      const prevIdx = (idx - 1 + photos.length) % photos.length;
                      setSelected(photos[prevIdx]);
                    }}
                  >
                    ‹
                  </button>
                  <button 
                    className="modal-nav-btn next" 
                    onClick={(e) => {
                      e.stopPropagation();
                      const idx = photos.findIndex(p => p.id === selected.id);
                      const nextIdx = (idx + 1) % photos.length;
                      setSelected(photos[nextIdx]);
                    }}
                  >
                    ›
                  </button>
                </>
              )}
              <img src={selected.imageUrl} alt={selected.title || '사진'} />
            </div>

            <div className="modal-details">
              <div className="modal-meta-header">
                <p className="modal-date">{formatDate(selected.createdAt)}</p>
                {selected.title && (
                  <h2 className="modal-title">{selected.title}</h2>
                )}
              </div>
              <div className="modal-divider" style={{ 
                height: '1px', 
                background: 'var(--border)', 
                margin: '1rem 0' 
              }} />
              <div className="modal-body">
                {selected.description ? (
                  <p className="modal-description" style={{ whiteSpace: 'pre-wrap', color: 'var(--ink-light)' }}>
                    {selected.description}
                  </p>
                ) : (
                  <p className="modal-description" style={{ fontStyle: 'italic', opacity: 0.5 }}>
                    코멘트가 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

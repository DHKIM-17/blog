'use client'

import { useState } from 'react'

export default function ArticleImageGroup({ type, urls }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalIndex, setModalIndex] = useState(0)

  if (!urls || urls.length === 0) return null

  const handleNext = (e) => {
    e?.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % urls.length)
  }

  const handlePrev = (e) => {
    e?.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + urls.length) % urls.length)
  }

  const count = urls.length
  let gridTemplate = '1fr 1fr'
  if (count === 3) gridTemplate = '2fr 1fr'
  if (count >= 4) gridTemplate = '1fr 1fr'

  return (
    <div className={`image-group-outer ${type.toLowerCase()}-mode`}>
      {/* 1. 슬라이드 형식 (Improved Layout) */}
      {type === 'SLIDER' && (
        <div className="slider-wrapper-layout">
          {urls.length > 1 && (
            <button className="slider-nav-outer prev" onClick={handlePrev} aria-label="Previous slide">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
          )}

          <div className="slider-viewport">
            <div 
              className="slider-track" 
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {urls.map((url, i) => (
                <div key={i} className="slider-slide" onClick={() => { setModalIndex(i); setIsModalOpen(true); }}>
                  <img src={url} alt={`Slide ${i + 1}`} loading="lazy" />
                </div>
              ))}
            </div>
            
            {/* 인덱스 표시는 이미지 내부 우측 하단 유지 (인스타 스타일) */}
            {urls.length > 1 && (
              <div className="slider-indicator">
                {currentIndex + 1} / {urls.length}
              </div>
            )}
          </div>

          {urls.length > 1 && (
            <button className="slider-nav-outer next" onClick={handleNext} aria-label="Next slide">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          )}
        </div>
      )}

      {/* 2. 콜라주 형식 (Grid Style) */}
      {type === 'COLLAGE' && (
        <div className="collage-grid">
          {urls.map((url, i) => (
            <div 
              key={i} 
              className={`collage-item i-${i}`} 
              onClick={() => { setModalIndex(i); setIsModalOpen(true); }}
            >
              <img src={url} alt={`Collage ${i + 1}`} loading="lazy" />
            </div>
          ))}
        </div>
      )}

      {/* 3. 공통 모달 확대 기능 */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content-inner" onClick={(e) => e.stopPropagation()}>
            <img src={urls[modalIndex]} alt="Enlarged view" />
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
          </div>
        </div>
      )}

      <style jsx>{`
        .image-group-outer {
          margin: 5rem -3rem; /* 본문보다 살찌우기 위해 마진 조절 */
          width: calc(100% + 6rem);
        }

        /* 슬라이더 레이아웃 (양옆 배치) */
        .slider-wrapper-layout {
          display: flex;
          align-items: center;
          gap: 1rem;
          width: 100%;
          position: relative;
        }

        .slider-viewport {
          flex: 1;
          position: relative;
          overflow: hidden;
          border-radius: var(--radius);
          aspect-ratio: 16/10;
          background: var(--paper-darker);
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }

        .slider-track {
          display: flex;
          width: 100%;
          height: 100%;
          transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .slider-slide {
          min-width: 100%;
          height: 100%;
          cursor: zoom-in;
        }

        .slider-slide img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          user-select: none;
        }

        /* 외부 화살표 버튼 */
        .slider-nav-outer {
          flex: 0 0 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--ink-light);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease;
          opacity: 0.6;
        }

        .slider-nav-outer:hover {
          opacity: 1;
          background: var(--paper-dark);
          color: var(--ink);
          transform: scale(1.1);
          border-color: var(--ink-faint);
        }

        .slider-indicator {
          position: absolute;
          bottom: 1.5rem;
          right: 1.5rem;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          padding: 0.4rem 1rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 500;
          backdrop-filter: blur(4px);
          user-select: none;
        }

        /* Collage Styles */
        .collage-grid {
          margin: 0 3rem; /* 콜라주는 원래 본문 폭에 맞춤 */
          display: grid;
          gap: 12px;
          grid-template-columns: ${gridTemplate};
        }
        .collage-item {
          position: relative;
          cursor: zoom-in;
          border-radius: var(--radius);
          overflow: hidden;
          background: var(--paper-darker);
          box-shadow: var(--shadow-sm);
        }
        .collage-item img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          transition: transform 0.4s ease;
        }
        .collage-item:hover img { transform: scale(1.03); }
        
        ${count === 3 ? `
          .collage-grid { grid-template-rows: 240px 240px; }
          .collage-item.i-0 { grid-row: span 2; height: 492px; }
          .collage-item.i-1, .collage-item.i-2 { height: 240px; }
        ` : ''}
        ${count === 2 ? ` .collage-item { aspect-ratio: 1; } ` : ''}
        ${count >= 4 ? ` .collage-grid { grid-template-columns: repeat(2, 1fr); } .collage-item { aspect-ratio: 1; } ` : ''}

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.95);
          z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: 2rem; cursor: zoom-out; backdrop-filter: blur(15px);
        }
        .modal-content-inner { position: relative; max-width: 95%; max-height: 95%; }
        .modal-content-inner img { max-width: 100%; max-height: 90vh; object-fit: contain; box-shadow: 0 10px 50px rgba(0,0,0,0.5); }
        .modal-close { position: absolute; top: -3rem; right: -1rem; font-size: 3rem; color: #fff; background: none; border: none; cursor: pointer; opacity: 0.6; }
        .modal-close:hover { opacity: 1; }

        /* Responsive */
        @media (max-width: 800px) {
          .image-group-outer {
            margin: 4rem 0;
            width: 100%;
          }
          .collage-grid { margin: 0; }
          .slider-nav-outer {
            position: absolute;
            background: rgba(255,255,255,0.8);
            backdrop-filter: blur(4px);
            z-index: 10;
            flex: none;
            opacity: 1;
          }
          .slider-nav-outer.prev { left: 1rem; }
          .slider-nav-outer.next { right: 1rem; }
        }

        @media (max-width: 500px) {
          .collage-grid { grid-template-columns: 1fr !important; grid-template-rows: auto !important; }
          .collage-item { height: 300px !important; grid-row: auto !important; }
        }
      `}</style>
    </div>
  )
}

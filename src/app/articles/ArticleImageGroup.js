'use client'

import { useState } from 'react'

export default function ArticleImageGroup({ type, urls }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalIndex, setModalIndex] = useState(0)

  if (!urls || urls.length === 0) return null

  const handleNext = (e) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % urls.length)
  }

  const handlePrev = (e) => {
    e.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + urls.length) % urls.length)
  }

  const count = urls.length
  let gridTemplate = '1fr 1fr'
  if (count === 3) gridTemplate = '2fr 1fr'
  if (count >= 4) gridTemplate = '1fr 1fr'

  return (
    <div className={`image-group-outer ${type.toLowerCase()}-mode`}>
      {/* 1. 슬라이드 형식 (Instagram Style) */}
      {type === 'SLIDER' && (
        <div className="slider-container">
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

          {urls.length > 1 && (
            <>
              <button className="slider-nav prev" onClick={handlePrev}>&lt;</button>
              <button className="slider-nav next" onClick={handleNext}>&gt;</button>
              <div className="slider-indicator">
                {currentIndex + 1} / {urls.length}
              </div>
            </>
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
          margin: 4rem auto;
          width: 100%;
        }
        
        /* Slider Styles */
        .slider-container {
          position: relative;
          overflow: hidden;
          border-radius: var(--radius);
          aspect-ratio: 16/10;
          background: var(--paper-darker);
          box-shadow: var(--shadow-sm);
        }
        .slider-track {
          display: flex;
          width: 100%;
          height: 100%;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
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
        .slider-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
          font-size: 1.2rem;
          color: var(--ink);
          box-shadow: var(--shadow-md);
          transition: all 0.2s;
          backdrop-filter: blur(8px);
        }
        .slider-nav:hover { background: #fff; transform: translateY(-50%) scale(1.1); }
        .slider-nav.prev { left: 1.2rem; }
        .slider-nav.next { right: 1.2rem; }
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
          letter-spacing: 0.05em;
        }

        /* Collage Styles */
        .collage-grid {
          display: grid;
          gap: 12px;
          width: 100%;
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
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.4s ease;
        }
        .collage-item:hover img {
            transform: scale(1.03);
        }
        
        ${count === 3 ? `
          .collage-grid { grid-template-rows: 200px 200px; }
          .collage-item.i-0 { grid-row: span 2; height: 412px; }
          .collage-item.i-1, .collage-item.i-2 { height: 200px; }
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
          padding: 2rem;
          cursor: zoom-out;
          backdrop-filter: blur(10px);
        }
        .modal-content-inner {
          position: relative;
          max-width: 95%;
          max-height: 95%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-content-inner img {
          max-width: 100%;
          max-height: 90vh;
          object-fit: contain;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        }
        .modal-close {
          position: absolute;
          top: -3rem;
          right: -1rem;
          font-size: 3rem;
          color: #fff;
          background: none;
          border: none;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .modal-close:hover { opacity: 1; }

        @media (max-width: 500px) {
          .collage-grid { grid-template-columns: 1fr !important; grid-template-rows: auto !important; }
          .collage-item { height: 300px !important; grid-row: auto !important; }
        }
      `}</style>
    </div>
  )
}

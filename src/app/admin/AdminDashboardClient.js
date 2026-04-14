'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function formatDate(dateStr) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '날짜 정보 없음'
  
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function toISODate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

export default function AdminDashboardClient({ initialPhotos, initialArticles }) {
  const router = useRouter()
  const photoInputRef = useRef(null)
  
  // Article Refs
  const articleContentRef = useRef(null)
  const imageUploadRef = useRef(null)

  const [activeTab, setActiveTab] = useState('articles')

  // Photo State (Gallery)
  const [photos, setPhotos] = useState(initialPhotos)
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState([])
  const [photoTitle, setPhotoTitle] = useState('')
  const [photoDesc, setPhotoDesc] = useState('')
  const [photoCreatedAt, setPhotoCreatedAt] = useState(toISODate(new Date()))
  const [photoUploading, setPhotoUploading] = useState(false)
  
  // Article State (Stories)
  const [articles, setArticles] = useState(initialArticles)
  const [articleTitle, setArticleTitle] = useState('')
  const [articleContent, setArticleContent] = useState('')
  const [articleCreatedAt, setArticleCreatedAt] = useState(toISODate(new Date()))
  const [articleUploadedImages, setArticleUploadedImages] = useState([]) // 본문에 사용된 사진들 URL 리스트
  const [articleThumbnailUrl, setArticleThumbnailUrl] = useState('')
  const [articleCategory, setArticleCategory] = useState('잡담')
  const [articleUploading, setArticleUploading] = useState(false)

  // Edit State
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editCreatedAt, setEditCreatedAt] = useState('')
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('')
  const [editCategory, setEditCategory] = useState('잡담')
  const [editUploadedImages, setEditUploadedImages] = useState([])

  // ----- Photo Handlers (Gallery) -----
  function handlePhotoFiles(files) {
    const arr = Array.from(files)
    setSelectedPhotoFiles(arr)
    const urls = arr.map((f) => URL.createObjectURL(f))
    setPhotoPreviews(urls)
  }

  async function handlePhotoUpload(e) {
    e.preventDefault()
    if (selectedPhotoFiles.length === 0) return
    setPhotoUploading(true)
    try {
      for (const file of selectedPhotoFiles) {
        const fd = new FormData()
        fd.append('image', file)
        fd.append('title', photoTitle)
        fd.append('description', photoDesc)
        if (photoCreatedAt) fd.append('createdAt', new Date(photoCreatedAt).toISOString())
        
        const res = await fetch('/api/photos', { method: 'POST', body: fd })
        let data
        try {
          data = await res.json()
        } catch (e) {
          throw new Error(`서버 응답 오류 (상태코드: ${res.status})`)
        }

        if (!res.ok) {
          throw new Error(data.error || `업로드 실패 (상태코드: ${res.status})`)
        }

        const { photo } = data
        setPhotos((prev) => [photo, ...prev])
      }
      setSelectedPhotoFiles([])
      setPhotoPreviews([])
      setPhotoTitle('')
      setPhotoDesc('')
      setPhotoCreatedAt(toISODate(new Date()))
      if (photoInputRef.current) photoInputRef.current.value = ''
    } catch (err) {
      alert('오류: ' + err.message)
    } finally {
      setPhotoUploading(false)
    }
  }

  async function handlePhotoDelete(id) {
    if (!confirm('삭제하시겠습니까?')) return
    const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' })
    if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  // ----- Article Handlers (Naver Blog Style) -----
  
  // 본문 내 사진 전송 및 삽입 공통 로직
  async function uploadImageFile(file) {
    if (!file) return

    const fd = new FormData()
    fd.append('image', file)

    try {
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
      let data
      try {
        data = await res.json()
      } catch (e) {
        throw new Error(`서버 응답 오류 (상태코드: ${res.status})`)
      }

      if (!res.ok) {
        throw new Error(data.error || `업로드 실패 (상태코드: ${res.status})`)
      }
      
      const url = data.url

      // 현재 커서 위치에 마크다운 태그 삽입
      const textarea = articleContentRef.current
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = articleContent
        const before = text.substring(0, start)
        const after = text.substring(end)
        const tag = `\n\n![사진 설명](${url})\n\n`
        
        const newText = before + tag + after
        setArticleContent(newText)
        
        // 업로드된 이미지 리스트에 추가 (썸네일 선택용)
        setArticleUploadedImages(prev => [...prev, url])
        // 첫 번째 이미지라면 썸네일로 자동 선택
        if (articleUploadedImages.length === 0 && !articleThumbnailUrl) {
            setArticleThumbnailUrl(url)
        }
      }
    } catch (err) {
      alert(err.message)
    }
  }

  // 버튼을 통한 파일 선택 시
  async function handleInsertImage(e) {
    const file = e.target.files?.[0]
    await uploadImageFile(file)
    if (imageUploadRef.current) imageUploadRef.current.value = ''
  }

  // 붙여넣기(Ctrl+V) 처리
  async function handlePaste(e) {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          // 기본 붙여넣기 동작 방지 (이미지만 업로드)
          e.preventDefault()
          await uploadImageFile(file)
        }
      }
    }
  }

  async function handleArticleSubmit(e) {
    e.preventDefault()
    if (!articleTitle || !articleContent) return
    setArticleUploading(true)
    try {
      const fd = new FormData()
      fd.append('title', articleTitle)
      fd.append('content', articleContent)
      fd.append('category', articleCategory)
      fd.append('thumbnailUrl', articleThumbnailUrl)
      if (articleCreatedAt) fd.append('createdAt', new Date(articleCreatedAt).toISOString())
      
      // 글에 사용된 모든 이미지 URL 리스트 전송
      articleUploadedImages.forEach(url => {
        fd.append('images', url)
      })

      const res = await fetch('/api/articles', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('저장 실패')
      const { article } = await res.json()
      setArticles((prev) => [article, ...prev])
      
      setArticleTitle('')
      setArticleContent('')
      setArticleCategory('잡담')
      setArticleCreatedAt(toISODate(new Date()))
      setArticleUploadedImages([])
      setArticleThumbnailUrl('')
    } catch (err) {
      alert('오류: ' + err.message)
    } finally {
      setArticleUploading(false)
    }
  }

  async function handleArticleDelete(id) {
    if (!confirm('삭제하시겠습니까?')) return
    const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' })
    if (res.ok) setArticles((prev) => prev.filter((a) => a.id !== id))
  }

  function startEditArticle(article) {
    setEditingId(article.id)
    setEditTitle(article.title)
    setEditContent(article.content)
    setEditCreatedAt(toISODate(article.createdAt))
    setEditThumbnailUrl(article.thumbnailUrl || '')
    setEditCategory(article.category || '잡담')
    setEditUploadedImages(article.images || [])
  }

  async function handleArticleUpdate(id) {
    try {
      const fd = new FormData()
      fd.append('title', editTitle)
      fd.append('content', editContent)
      fd.append('category', editCategory)
      fd.append('createdAt', new Date(editCreatedAt).toISOString())
      fd.append('thumbnailUrl', editThumbnailUrl)
      
      editUploadedImages.forEach(url => fd.append('images', url))

      const res = await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        body: fd
      })
      if (!res.ok) throw new Error('업데이트 실패')
      const { article } = await res.json()
      setArticles(prev => prev.map(a => a.id === id ? article : a))
      setEditingId(null)
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <span className="admin-nav-title">🦦 — Admin Dashboard</span>
        <div className="admin-nav-actions">
          <Link href="/" className="admin-nav-link">블로그 홈으로</Link>
          <button onClick={handleLogout} className="btn btn-ghost" style={{ padding: '0.4rem 0.9rem', fontSize: '0.7rem' }}>
            로그아웃
          </button>
        </div>
      </nav>

      <main className="admin-main">
        <div className="admin-tabs">
          <button 
            className={`admin-tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
            onClick={() => setActiveTab('photos')}
          >
            Gallery Management
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'articles' ? 'active' : ''}`}
            onClick={() => setActiveTab('articles')}
          >
            Article Management
          </button>
        </div>

        {activeTab === 'photos' ? (
          <section>
            <div className="admin-page-header">
              <h2 className="admin-page-title">Gallery Upload</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--ink-lighter)' }}>총 {photos.length}장</span>
            </div>

            <form onSubmit={handlePhotoUpload} className="upload-form">
              <div className="upload-area" onClick={() => photoInputRef.current?.click()}>
                <div className="upload-area-icon">↑</div>
                <h3>사진 선택</h3>
                <p>클릭하여 업로드할 사진을 선택하세요</p>
                <input ref={photoInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => handlePhotoFiles(e.target.files)} />
              </div>

              {photoPreviews.length > 0 && (
                <div className="upload-preview" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {photoPreviews.map((url, i) => <img key={i} src={url} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '4px' }} />)}
                </div>
              )}

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label className="form-label">제목</label>
                <input type="text" className="form-input" value={photoTitle} onChange={(e) => setPhotoTitle(e.target.value)} placeholder="사진 제목 (선택)" />
              </div>
              <div className="form-group">
                <label className="form-label">작성일 설정</label>
                <input type="date" className="form-input" value={photoCreatedAt} onChange={(e) => setPhotoCreatedAt(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">코멘트</label>
                <textarea className="form-textarea" value={photoDesc} onChange={(e) => setPhotoDesc(e.target.value)} placeholder="사진에 대한 설명을 적어주세요 (선택)" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={photoUploading || selectedPhotoFiles.length === 0} style={{ width: '100%' }}>
                {photoUploading ? '저장 중...' : '갤러리에 사진 저장'}
              </button>
            </form>

            <div className="admin-photo-list" style={{ marginTop: '4rem' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>기존 사진 목록</h3>
              {photos.map(p => (
                <div key={p.id} className="admin-item">
                  <img src={p.imageUrl} alt={p.title} />
                  <div style={{ flex: 1 }}>
                    <h4 className="admin-photo-meta-title">{p.title || '제목 없음'}</h4>
                    <p className="admin-photo-meta-date">{formatDate(p.createdAt)}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button className="btn btn-danger" onClick={() => handlePhotoDelete(p.id)} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section>
            <div className="admin-page-header">
              <h2 className="admin-page-title">Article Creation</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--ink-lighter)' }}>총 {articles.length}건</span>
            </div>

            <form onSubmit={handleArticleSubmit} className="upload-form">
              <div className="form-group">
                <label className="form-label">제목</label>
                <input type="text" className="form-input" value={articleTitle} onChange={(e) => setArticleTitle(e.target.value)} placeholder="제목을 입력하세요" />
              </div>

              <div className="form-group">
                <label className="form-label">작성일 설정</label>
                <input type="date" className="form-input" value={articleCreatedAt} onChange={(e) => setArticleCreatedAt(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">카테고리</label>
                <select 
                  className="form-input" 
                  value={articleCategory} 
                  onChange={(e) => setArticleCategory(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="여행">여행</option>
                  <option value="영화">영화</option>
                  <option value="잡담">잡담</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <label className="form-label">본문 작성</label>
                <div style={{ marginBottom: '1rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    onClick={() => imageUploadRef.current?.click()}
                  >
                    📷 본문에 사진 삽입하기
                  </button>
                  <input ref={imageUploadRef} type="file" accept="image/*" hidden onChange={handleInsertImage} />
                </div>
                <textarea 
                  ref={articleContentRef}
                  className="form-textarea" 
                  style={{ minHeight: '400px', lineHeight: '1.6', fontSize: '1rem' }}
                  value={articleContent} 
                  onChange={(e) => setArticleContent(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="네이버 블로그처럼 글 중간중간 사진을 넣어 이야기를 완성해 보세요. (Markdown 지원)"
                />
              </div>

              {articleUploadedImages.length > 0 && (
                <div className="form-group">
                  <label className="form-label">목록 대표 사진(썸네일) 선택</label>
                  <p style={{ fontSize: '0.7rem', color: 'var(--ink-light)', marginBottom: '0.8rem' }}>
                    * 본문에 사용된 사진들입니다. 목록에 노출할 사진 하나를 클릭해 주세요.
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {articleUploadedImages.map((url, i) => (
                      <div 
                        key={i} 
                        onClick={() => setArticleThumbnailUrl(url)}
                        style={{ 
                          position: 'relative', 
                          cursor: 'pointer',
                          border: articleThumbnailUrl === url ? '3px solid var(--accent)' : '2px solid var(--border)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          width: 80, height: 80
                        }}
                      >
                        <img src={url} alt={`uploaded-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {articleThumbnailUrl === url && (
                            <div style={{ position: 'absolute', top: 0, left: 0, background: 'var(--accent)', color: 'white', fontSize: '10px', padding: '2px 4px' }}>대표</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={articleUploading} style={{ width: '100%', marginTop: '2rem' }}>
                {articleUploading ? '저장 중...' : '새 글 발행하기'}
              </button>
            </form>

            <div className="admin-article-list" style={{ marginTop: '4rem' }}>
              <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>기존 글 목록</h3>
              {articles.map(a => (
                <div key={a.id} className="admin-item">
                  <div style={{ background: '#eee', width: 100, height: 100, overflow: 'hidden', borderRadius: '4px' }}>
                    {a.thumbnailUrl && <img src={a.thumbnailUrl} alt={a.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  {editingId === a.id ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <input type="text" className="form-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="제목" />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select 
                          className="form-input" 
                          value={editCategory} 
                          onChange={(e) => setEditCategory(e.target.value)}
                          style={{ flex: 1, cursor: 'pointer' }}
                        >
                          <option value="여행">여행</option>
                          <option value="영화">영화</option>
                          <option value="잡담">잡담</option>
                        </select>
                        <input type="date" className="form-input" style={{ flex: 1 }} value={editCreatedAt} onChange={(e) => setEditCreatedAt(e.target.value)} />
                      </div>
                      <textarea className="form-textarea" value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="본문" style={{ minHeight: '150px' }} />
                      
                      <p style={{ fontSize: '0.75rem', marginBottom: '-0.3rem' }}>대표 이미지 변경:</p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        {a.images && a.images.map((url, i) => (
                           <div 
                           key={i} 
                           onClick={() => setEditThumbnailUrl(url)}
                           style={{ 
                             position: 'relative', 
                             cursor: 'pointer',
                             border: editThumbnailUrl === url ? '3px solid var(--accent)' : '3px solid transparent',
                             borderRadius: '4px',
                             overflow: 'hidden'
                           }}
                         >
                           <img src={url} alt={`existing-${i}`} style={{ width: 50, height: 50, objectFit: 'cover' }} />
                         </div>
                        ))}
                      </div>

                      <textarea className="form-textarea" value={editContent} onChange={(e) => setEditContent(e.target.value)} placeholder="본문" style={{ minHeight: '150px' }} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary" onClick={() => handleArticleUpdate(a.id)} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>저장</button>
                        <button className="btn btn-ghost" onClick={() => setEditingId(null)} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>취소</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <h4 className="article-card-title" style={{ fontSize: '1rem', fontWeight: '500' }}>{a.title}</h4>
                      <p className="article-card-date">{formatDate(a.createdAt)}</p>
                    </div>
                  )}
                  {editingId !== a.id && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <button className="btn btn-ghost" onClick={() => startEditArticle(a)} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>수정</button>
                      <button className="btn btn-danger" onClick={() => handleArticleDelete(a.id)} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>삭제</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

function toISODate(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toISOString().split('T')[0]
  } catch {
    return ''
  }
}

export default function AdminBanner({ isAdmin }) {
  const router = useRouter()
  const pathname = usePathname()

  const [isOpen, setIsOpen] = useState(false)
  const [activeMode, setActiveMode] = useState(null)

  // Photo State
  const photoInputRef = useRef(null)
  const [photoTitle, setPhotoTitle] = useState('')
  const [photoDesc, setPhotoDesc] = useState('')
  const [photoCreatedAt, setPhotoCreatedAt] = useState(toISODate(new Date()))
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null)

  // Story State
  const articleContentRef = useRef(null)
  const imageUploadRef = useRef(null)
  const [articleTitle, setArticleTitle] = useState('')
  const [articleContent, setArticleContent] = useState('')
  const [articleCreatedAt, setArticleCreatedAt] = useState(toISODate(new Date()))
  const [articleUploadedImages, setArticleUploadedImages] = useState([])
  const [articleThumbnailUrl, setArticleThumbnailUrl] = useState('')
  const [articleUploading, setArticleUploading] = useState(false)

  // 페이지 이동 시 드로어 닫기
  useEffect(() => {
    setIsOpen(false)
    setActiveMode(null)
  }, [pathname])

  // 서버 prop으로만 판단 — 클라이언트 상태 없음
  if (!isAdmin) return null

  async function handlePhotoUpload(e) {
    e.preventDefault()
    if (!selectedPhotoFile) return
    setPhotoUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', selectedPhotoFile)
      fd.append('title', photoTitle)
      fd.append('description', photoDesc)
      if (photoCreatedAt) fd.append('createdAt', new Date(photoCreatedAt).toISOString())

      const res = await fetch('/api/photos', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('업로드 실패')

      alert('사진이 업로드되었습니다.')
      setIsOpen(false)
      setSelectedPhotoFile(null)
      setPhotoPreview(null)
      setPhotoTitle('')
      setPhotoDesc('')
      router.refresh()
    } catch (err) {
      alert(err.message)
    } finally {
      setPhotoUploading(false)
    }
  }

  // 본문 이미지 업로드 및 태그 삽입 공통 로직
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
      
      const { url } = data
      const textarea = articleContentRef.current
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const text = articleContent
        const tag = `\n\n![사진 설명](${url})\n\n`
        setArticleContent(text.substring(0, start) + tag + text.substring(end))
        setArticleUploadedImages(prev => [...prev, url])
        if (!articleThumbnailUrl) setArticleThumbnailUrl(url)
      }
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleInsertImage(e) {
    const file = e.target.files?.[0]
    await uploadImageFile(file)
    if (imageUploadRef.current) imageUploadRef.current.value = ''
  }

  async function handlePaste(e) {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
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
      fd.append('thumbnailUrl', articleThumbnailUrl)
      if (articleCreatedAt) fd.append('createdAt', new Date(articleCreatedAt).toISOString())
      articleUploadedImages.forEach(url => fd.append('images', url))

      const res = await fetch('/api/articles', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('저장 실패')

      alert('이야기가 발행되었습니다.')
      setIsOpen(false)
      setArticleTitle('')
      setArticleContent('')
      setArticleUploadedImages([])
      setArticleThumbnailUrl('')
      router.refresh()
      router.push('/articles')
    } catch (err) {
      alert(err.message)
    } finally {
      setArticleUploading(false)
    }
  }

  async function handleLogout() {
    setIsOpen(false)
    await fetch('/api/admin/logout', { method: 'POST' })
    // 전체 페이지를 하드 리로드해서 서버 레이아웃을 완전히 새로 그림
    window.location.href = '/admin/login'
  }

  return (
    <div className="admin-banner-wrapper">
      <div className="admin-banner-bar">
        <div className="banner-left">
          <span className="banner-tag">Admin Mode</span>
          <button className={`banner-btn ${activeMode === 'photo' ? 'active' : ''}`} onClick={() => {
            setIsOpen(activeMode === 'photo' ? !isOpen : true)
            setActiveMode('photo')
          }}>사진 올리기</button>
          <button className={`banner-btn ${activeMode === 'story' ? 'active' : ''}`} onClick={() => {
            setIsOpen(activeMode === 'story' ? !isOpen : true)
            setActiveMode('story')
          }}>글 쓰기</button>
        </div>
        <div className="banner-right">
          <Link href="/admin" className="banner-link">대시보드</Link>
          <button onClick={handleLogout} className="banner-link">로그아웃</button>
        </div>
      </div>

      <div className={`admin-banner-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-container">
          {activeMode === 'photo' && (
            <form onSubmit={handlePhotoUpload} className="quick-form">
              <h3>갤러리 사진 추가</h3>
              <div className="quick-form-grid">
                <div className="quick-form-left">
                  <div className="upload-box" onClick={() => photoInputRef.current?.click()}>
                    {photoPreview ? <img src={photoPreview} /> : <span>클릭하여 사진 선택</span>}
                    <input ref={photoInputRef} type="file" hidden onChange={e => {
                      const file = e.target.files[0]
                      if (file) {
                        setSelectedPhotoFile(file)
                        setPhotoPreview(URL.createObjectURL(file))
                      }
                    }} />
                  </div>
                </div>
                <div className="quick-form-right">
                  <input className="form-input" placeholder="제목 (선택)" value={photoTitle} onChange={e => setPhotoTitle(e.target.value)} />
                  <input className="form-input" type="date" value={photoCreatedAt} onChange={e => setPhotoCreatedAt(e.target.value)} />
                  <textarea className="form-textarea" placeholder="사진 코멘트 (선택)" value={photoDesc} onChange={e => setPhotoDesc(e.target.value)} />
                  <button type="submit" className="btn btn-primary" disabled={photoUploading}>
                    {photoUploading ? '업로드 중...' : '갤러리에 저장'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeMode === 'story' && (
            <form onSubmit={handleArticleSubmit} className="quick-form">
              <h3>새 글 작성</h3>
              <input className="form-input" style={{ fontSize: '1.2rem', marginBottom: '1rem' }} placeholder="제목을 입력하세요" value={articleTitle} onChange={e => setArticleTitle(e.target.value)} />

              <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button type="button" className="btn btn-ghost" style={{ fontSize: '0.7rem' }} onClick={() => imageUploadRef.current?.click()}>📷 사진 삽입</button>
                <input ref={imageUploadRef} type="file" hidden onChange={handleInsertImage} />
                <input className="form-input" type="date" style={{ width: 'auto' }} value={articleCreatedAt} onChange={e => setArticleCreatedAt(e.target.value)} />
              </div>

              <textarea
                ref={articleContentRef}
                className="form-textarea"
                style={{ minHeight: '300px' }}
                placeholder="내용을 입력하세요 (마크다운 지원)"
                value={articleContent}
                onChange={e => setArticleContent(e.target.value)}
                onPaste={handlePaste}
              />

              {articleUploadedImages.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ fontSize: '0.7rem', marginBottom: '0.5rem' }}>대표 사진 선택:</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {articleUploadedImages.map((url, i) => (
                      <img key={i} src={url} className={`thumb-choice ${articleThumbnailUrl === url ? 'active' : ''}`} onClick={() => setArticleThumbnailUrl(url)} />
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem' }} disabled={articleUploading}>
                {articleUploading ? '발행 중...' : '글 발행하기'}
              </button>
            </form>
          )}
        </div>
        <button className="drawer-close" onClick={() => setIsOpen(false)}>×</button>
      </div>
    </div>
  )
}

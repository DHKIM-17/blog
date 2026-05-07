'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// [v1.0.4] 하이브리드 모드 지원 및 상태 표시
const VERSION = 'Admin v1.0.4'
const isDBConnected = !!process.env.NEXT_PUBLIC_POSTGRES_URL || true;

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

  // [v1.0.1] 안전한 JSON 파싱 유틸리티
  const safeJson = async (res, actionName) => {
    const contentType = res.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `${actionName} 실패 (상태: ${res.status})`)
      return data
    } else {
      const text = await res.text()
      if (res.status === 413 || text.includes('Request Entity Too Large')) {
        throw new Error(`${actionName} 오류: 파일 용량이 너무 큼 (Vercel 4.5MB 제한). 고화질 사진을 여러 장 한꺼번에 올리는 경우 발생할 수 있습니다.`)
      }
      throw new Error(`${actionName} 오류 (${res.status}): 서버가 비정상 응답을 반환했습니다.`)
    }
  }

  // --- 공통 R2 다이렉트 업로드 함수 ---
  async function uploadToR2(file) {
    // 1. 서버에 Presigned URL 요청
    const res = await fetch('/api/admin/blob/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type || 'application/octet-stream' })
    });
    
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || '업로드 URL 요청 실패');
    }
    
    const { uploadUrl, publicUrl } = await res.json();

    // 2. R2로 다이렉트 업로드 (PUT)
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' }
    });

    if (!uploadRes.ok) {
      throw new Error('R2 서버 업로드 실패');
    }

    return publicUrl;
  }
  
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
  
  // Pending Group (본문 다중 삽입용 임시 상태)
  const [pendingGroupUrls, setPendingGroupUrls] = useState([])

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
        // 1. R2 다이렉트 업로드 (용량 제한 없음)
        const url = await uploadToR2(file);

        // 2. 업로드된 URL과 메타데이터를 서버에 저장
        const res = await fetch('/api/photos', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageUrl: url,
                title: photoTitle,
                description: photoDesc,
                createdAt: photoCreatedAt ? new Date(photoCreatedAt).toISOString() : null
            })
        })

        const { photo } = await safeJson(res, '갤러리 저장')
        setPhotos((prev) => [photo, ...prev])
      }
      setSelectedPhotoFiles([])
      setPhotoPreviews([])
      setPhotoTitle('')
      setPhotoDesc('')
      setPhotoCreatedAt(toISODate(new Date()))
      if (photoInputRef.current) photoInputRef.current.value = ''
    } catch (err) {
      alert(err.message)
    } finally {
      setPhotoUploading(false)
    }
  }

  async function handlePhotoDelete(id) {
    if (!confirm('삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/photos/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const text = await res.text()
        console.warn('Photo delete warning:', text)
      }
      setPhotos((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      console.error('Photo delete error:', err)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  // ----- Article Handlers (Naver Blog Style) -----
  
  function insertAtCursor(tag) {
    const textarea = articleContentRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = articleContent
    const before = text.substring(0, start)
    const after = text.substring(end)
    
    const newText = before + tag + after
    setArticleContent(newText)
    
    // 포커스 유지 및 커서 이동
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + tag.length, start + tag.length)
    }, 10)
  }

  async function handleInsertImage(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    
    setArticleUploading(true)
    const uploadedUrls = []

    try {
      for (const file of files) {
        // R2 다이렉트 업로드
        const url = await uploadToR2(file);
        uploadedUrls.push(url)
        
        // 업로드된 이미지 리스트에 추가 (썸네일 선택용)
        setArticleUploadedImages(prev => [...prev, url])
        // 첫 번째 이미지라면 썸네일로 자동 선택
        if (!articleThumbnailUrl && uploadedUrls.length === 1) {
            setArticleThumbnailUrl(url)
        }
      }

      if (files.length === 1) {
        insertAtCursor(`\n\n![이미지 설명](${uploadedUrls[0]})\n\n`)
      } else {
        setPendingGroupUrls(uploadedUrls)
      }
    } catch (err) {
      alert(err.message)
    } finally {
      setArticleUploading(false)
      if (imageUploadRef.current) imageUploadRef.current.value = ''
    }
  }

  function handleInsertGroup(type) {
    if (pendingGroupUrls.length === 0) return
    const tag = `\n\n![${type}](${pendingGroupUrls.join(',')})\n\n`
    insertAtCursor(tag)
    setPendingGroupUrls([])
  }

  // 붙여넣기(Ctrl+V) 처리
  async function handlePaste(e) {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          setArticleUploading(true)
          try {
            const url = await uploadToR2(file);
            insertAtCursor(`\n\n![이미지 설명](${url})\n\n`)
            setArticleUploadedImages(prev => [...prev, url])
            if (!articleThumbnailUrl) setArticleThumbnailUrl(url)
          } catch (err) {
            alert('붙여넣기 업로드 실패: ' + err.message)
          } finally {
            setArticleUploading(false)
          }
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
      const data = await safeJson(res, '글 저장')
      const { article } = data
      setArticles((prev) => [article, ...prev])
      
      setArticleTitle('')
      setArticleContent('')
      setArticleCategory('잡담')
      setArticleCreatedAt(toISODate(new Date()))
      setArticleUploadedImages([])
      setArticleThumbnailUrl('')
    } catch (err) {
      alert(err.message)
    } finally {
      setArticleUploading(false)
    }
  }

  async function handleArticleDelete(id) {
    if (!confirm('삭제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const text = await res.text()
        console.warn('Article delete warning:', text)
      }
      setArticles((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      console.error('Article delete error:', err)
      alert('삭제 중 오류가 발생했습니다.')
    }
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

  // [v1.2.1] 사진 삭제 및 본문 동기화 지우개
  function handleRemoveEditImage(urlToRemove) {
    if (!confirm('이 사진을 첨부 목록과 본문에서 완전히 삭제하시겠습니까?')) return;
    
    // 1. 첨부 배열에서 제거
    const newImages = editUploadedImages.filter(url => url !== urlToRemove);
    setEditUploadedImages(newImages);
    
    // 2. 만약 지워진 사진이 대표 사진이었다면 다음 사진으로 바통 터치
    if (editThumbnailUrl === urlToRemove) {
      setEditThumbnailUrl(newImages.length > 0 ? newImages[0] : '');
    }
    
    // 3. 본문에 찍혀있는 마크다운 URL 흔적까지 정규식으로 박멸
    const escapedUrl = urlToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexMarkdown = new RegExp(`!\\[(.*?)\\]\\(${escapedUrl}\\)`, 'g');
    const regexPlain = new RegExp(escapedUrl, 'g');
    const regexCollageFix = new RegExp(`,?${escapedUrl},?`, 'g'); // 콜라주 찌꺼기 콤마 제거 방어망
    
    let updatedContent = editContent;
    updatedContent = updatedContent.replace(regexMarkdown, '');
    updatedContent = updatedContent.replace(regexPlain, '');
    updatedContent = updatedContent.replace(regexCollageFix, ','); // 콜라주에서 URL만 빠졌을 때 콤마 정리
    updatedContent = updatedContent.replace(/\(,/g, '(').replace(/,\)/g, ')'); 
    
    setEditContent(updatedContent);
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
      
      const data = await safeJson(res, '글 업데이트')
      const { article } = data
      setArticles(prev => prev.map(a => a.id === id ? article : a))
      setEditingId(null)
    } catch (err) {
      alert(err.message)
    }
  }

  async function handleLogout() {
    try {
      const res = await fetch('/api/admin/logout', { method: 'POST' })
      if (!res.ok) {
        const text = await res.text()
        console.warn('Logout warning:', text)
      }
    } catch (err) {
      console.error('Logout error:', err)
    }
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span className="admin-nav-title">🦦 Admin v1.0.3</span>
          <span style={{ 
            fontSize: '9px', 
            padding: '2px 6px', 
            borderRadius: '10px', 
            background: 'var(--paper-dark)',
            color: 'var(--ink-light)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            border: '1px solid var(--border)'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ff4d4f' }}></span>
            DB 연결 필요 (로컬 모드)
          </span>
        </div>
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
                    📷 사진 추가 (여러 장 가능)
                  </button>
                  <input ref={imageUploadRef} type="file" accept="image/*" multiple hidden onChange={handleInsertImage} />
                </div>

                {pendingGroupUrls.length > 0 && (
                  <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'var(--paper-dark)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.85rem', marginBottom: '1rem', fontWeight: 600 }}>🏷️ 방금 올린 사진({pendingGroupUrls.length}장)을 어떻게 넣을까요?</p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button type="button" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => handleInsertGroup('SLIDER')}>🎞️ 슬라이드로 넣기</button>
                      <button type="button" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => handleInsertGroup('COLLAGE')}>▦ 격자(콜라주)로 넣기</button>
                      <button type="button" className="btn btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }} onClick={() => setPendingGroupUrls([])}>취소</button>
                    </div>
                  </div>
                )}

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
                      
                      <p style={{ fontSize: '0.75rem', marginBottom: '-0.3rem', marginTop: '0.5rem', color: 'var(--ink-light)' }}>
                        첨부 사진 관리 (사진 클릭: 대표 지정 / ✕: 삭제)
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        {editUploadedImages && editUploadedImages.map((url, i) => (
                           <div 
                           key={i} 
                           style={{ 
                             position: 'relative', 
                             cursor: 'pointer',
                             border: editThumbnailUrl === url ? '3px solid var(--accent)' : '2px solid var(--border)',
                             borderRadius: '4px',
                             overflow: 'hidden',
                             width: 60, height: 60
                           }}
                         >
                           <img 
                             src={url} 
                             alt={`existing-${i}`} 
                             onClick={() => setEditThumbnailUrl(url)} 
                             style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                           />
                           
                           {/* 대표 뱃지 */}
                           {editThumbnailUrl === url && (
                             <div style={{ pointerEvents: 'none', position: 'absolute', top: 0, left: 0, background: 'var(--accent)', color: 'white', fontSize: '10px', padding: '2px 4px' }}>대표</div>
                           )}
                           
                           {/* 개별 삭제(X) 버튼 오버레이 */}
                           <button 
                             type="button"
                             onClick={(e) => { e.stopPropagation(); handleRemoveEditImage(url); }}
                             style={{ 
                               position: 'absolute', top: '2px', right: '2px', 
                               background: 'rgba(255,0,0,0.85)', color: 'white', 
                               border: 'none', borderRadius: '50%', 
                               width: '18px', height: '18px', fontSize: '10px', fontWeight: 'bold',
                               display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                             }}
                           >
                             ✕
                           </button>
                         </div>
                        ))}
                      </div>

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
      <div className="admin-version-tag">Admin v1.0.3 (Hybrid Mode)</div>
    </div>
  )
}

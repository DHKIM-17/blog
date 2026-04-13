'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setPending(true)
    setError('')

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      window.location.href = '/admin'
    } else {
      const data = await res.json()
      setError(data.error || '로그인에 실패했습니다.')
      setPending(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <span className="auth-label">Admin Access</span>
        <h1 className="auth-title">관리자 로그인</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              required
              autoFocus
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button
            id="login-submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: '1.5rem' }}
            disabled={pending}
          >
            {pending ? '로그인 중…' : '로그인'}
          </button>
        </form>
        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--ink-faint)', textAlign: 'center' }}>
          <a href="/" style={{ color: 'var(--ink-lighter)' }}>← 블로그로 돌아가기</a>
        </p>
      </div>
    </main>
  )
}

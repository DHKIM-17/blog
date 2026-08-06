# CLAUDE.md - Photo Blog Project Guide

## 📌 Project Overview
사진과 이야기를 기록하는 개인 블로그 웹 애플리케이션 (Next.js App Router 기반).

- **배포 주소**: `https://photo-blog-ashy-iota.vercel.app`
- **GitHub 저장소**: `https://github.com/DHKIM-17/blog` (`main` 브랜치 푸시 시 Vercel 자동 배포)

---

## 🛠 Tech Stack & Architecture

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI & Styling**: React 19, Vanilla CSS (`src/app/globals.css`), React Markdown (`remark-gfm`)
- **Database (Hybrid Engine)**:
  - **Production/Cloud**: Vercel Postgres / Neon PostgreSQL (`@vercel/postgres`)
  - **Local Fallback**: Local JSON storage (`scratch/local_db.json`) when `POSTGRES_URL` is unconfigured (`src/lib/db.js`)
- **Storage / Media Upload**:
  - **Cloudflare R2**: Direct client-side presigned URL upload for large images (`@aws-sdk/client-s3`)
  - **Vercel Blob**: Auxiliary image/media storage (`@vercel/blob`)
- **Authentication**: Custom session-based auth with `jose` JWT (`src/lib/session.js`)

---

## 📂 Key Directory Structure

```text
src/
├── app/
│   ├── page.js                    # 갤러리 메인 홈
│   ├── layout.js                  # 공통 레이아웃 (헤더, 푸터)
│   ├── globals.css                # 디자인 시스템 & 전역 디자인 CSS
│   ├── AdminBanner.js             # 관리자 상단 퀵 작성/수정 드로어 폼
│   ├── GalleryClient.js           # 갤러리 사진 목록 클라이언트 컴포넌트
│   ├── admin/                     # 대시보드 및 관리자 로그인
│   │   ├── page.js
│   │   ├── AdminDashboardClient.js
│   │   └── login/page.js
│   ├── articles/                  # 이야기(Articles) 관련 페이지
│   │   ├── page.js
│   │   ├── ArticlesClient.js       # 카테고리 필터링 (여행, 영화, 독후감, 잡담 등)
│   │   ├── ArticleImageGroup.js   # 이미지 그룹 (SLIDER, COLLAGE) 렌더링
│   │   └── [id]/page.js           # 글 상세 보기
│   └── api/                       # API 라우트
│       ├── articles/              # 글 CRUD (GET, POST, PATCH, DELETE)
│       ├── photos/                # 갤러리 사진 CRUD
│       └── admin/                 # 인증 및 R2 업로드 presigned URL 발급
└── lib/
    ├── db.js                      # DB 헬퍼 (Postgres/로컬 JSON 하이브리드 엔진)
    └── session.js                 # 세션 유효성 검사 유틸리티
```

---

## 💻 Common Commands

- **개발 서버 실행**:
  ```bash
  npm run dev
  ```
- **프로덕션 빌드 검증**:
  ```bash
  npm run build
  ```
- **린터 체크**:
  ```bash
  npm run lint
  ```
- **Git 푸시 (자동 배포)**:
  ```bash
  git add -u
  git commit -m "feat: 메시지"
  git push origin main
  ```

---

## ⚠️ Development Guidelines & Caveats

1. **카테고리 수정 시 동기화 필수**:
   - 이야기 카테고리 목록: `['여행', '영화', '독후감', '잡담', '유럽생활일지', '경기장 투어']`
   - 카테고리를 변경하거나 신규 추가할 경우 아래 파일들의 `<select>` 옵션 및 배열을 함께 동기화해야 합니다:
     - `src/app/articles/ArticlesClient.js`
     - `src/app/AdminBanner.js`
     - `src/app/admin/AdminDashboardClient.js`

2. **DB 하이브리드 모드 유의사항**:
   - `src/lib/db.js`는 `POSTGRES_URL` 환경 변수 존재 여부에 따라 Vercel Postgres SQL과 로컬 파일(`scratch/local_db.json`)로 자동 분기됩니다.
   - 로컬 테스트 후 데이터 스키마 변경 시 cloud DB 환경에 영향이 없도록 `src/app/api/debug/migrate` 라우터와 쿼리를 점검하세요.

3. **대용량 이미지 업로드**:
   - 고화질/다중 이미지는 Vercel 4.5MB Payload 제한을 피하기 위해 `/api/admin/blob/upload` 라우트를 통해 Cloudflare R2 Presigned URL을 받아 Direct PUT 요청 방식으로 처리됩니다.

4. **Windows 터미널 환경**:
   - npm 명령어를 실행할 때 스크립트 실행 정책에 걸릴 경우 `cmd /c "npm.cmd run build"` 형태로 실행하거나 PowerShell 실행 권한을 확인하세요.

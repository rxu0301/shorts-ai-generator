# 🎬 AI 쇼츠 생성기

주제와 분량을 선택하면 AI가 쇼츠 대본을 자동으로 작성하고, 장면별 이미지 생성과 음성 낭독까지 한 번에 처리해주는 웹 앱입니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| 📝 대본 생성 | 주제·톤·분량(10초 / 30초 / 1분) 선택 → GPT-4o-mini가 장면별 대본 작성 |
| 🖼 이미지 생성 | 장면마다 이미지 생성 버튼 — 모델(gpt-image-2 / gpt-image-1.5)과 유형(실사 / 키툰 / 애니메이션) 선택 가능 |
| 🔊 TTS 낭독 | OpenAI TTS로 전체 대본 음성 합성 — 음성 종류·속도·높낮이 조절 |
| 📋 복사 | 생성된 대본을 JSON 형태로 클립보드에 복사 |

---

## 🗂 프로젝트 구조

```
ai-shorts-app/
├── frontend/               # Next.js 14 (App Router)
│   ├── app/
│   │   ├── page.tsx        # 메인 UI
│   │   └── api/
│   │       └── image/
│   │           └── route.ts  # 이미지 생성 API (Next.js Route Handler)
│   ├── .env.local          # 프론트엔드 환경 변수 (gitignore됨)
│   └── next.config.ts      # /api/script, /api/tts → backend 프록시
│
├── backend/                # Express + TypeScript
│   ├── src/
│   │   ├── index.ts        # 서버 진입점 (port 4000)
│   │   └── routes/
│   │       ├── script.ts   # 대본 생성 라우트
│   │       └── tts.ts      # TTS 라우트
│   └── .env                # 백엔드 환경 변수 (gitignore됨)
│
└── README.md
```

---

## 🚀 로컬 실행

### 사전 준비
- Node.js 18+
- OpenAI API 키

### 1. 백엔드

```bash
cd backend
npm install
cp .env.example .env
# .env에 OPENAI_API_KEY 입력
npm run dev
# → http://localhost:4000
```

### 2. 프론트엔드

```bash
cd frontend
npm install
# .env.local 생성
echo "OPENAI_API_KEY=sk-..." > .env.local
npm run dev
# → http://localhost:3000
```

> 백엔드와 프론트엔드를 **동시에** 실행해야 합니다.  
> 프론트엔드의 `/api/script`, `/api/tts` 요청은 `next.config.ts`의 rewrite를 통해 `localhost:4000`으로 프록시됩니다.

---

## 🔧 환경 변수

### `backend/.env`

| 변수 | 필수 | 설명 |
|------|------|------|
| `OPENAI_API_KEY` | ✅ | OpenAI API 키 |
| `PORT` | — | 백엔드 포트 (기본값: `4000`) |

### `frontend/.env.local`

| 변수 | 필수 | 설명 |
|------|------|------|
| `OPENAI_API_KEY` | ✅ | 이미지 생성 Route Handler에서 사용 |

---

## 🌐 API 엔드포인트

### 백엔드 (Express · port 4000)

| 엔드포인트 | 메서드 | 파라미터 | 설명 |
|-----------|--------|----------|------|
| `/api/script` | POST | `topic`, `tone`, `duration` | 대본 생성 |
| `/api/tts` | POST | `text`, `voice`, `speed` | 음성 합성 |
| `/health` | GET | — | 서버 상태 확인 |

**`duration` 값**

| 값 | 장면 수 | 설명 |
|----|---------|------|
| `10s` | 2장면 | 10초 분량 |
| `30s` | 5장면 | 30초 분량 (기본값) |
| `60s` | 10장면 | 1분 분량 |

### 프론트엔드 Route Handler (Next.js)

| 엔드포인트 | 메서드 | 파라미터 | 설명 |
|-----------|--------|----------|------|
| `/api/image` | POST | `prompt`, `model`, `style` | 이미지 생성 |

**`style` 값**: `realistic` / `cartoon` / `anime`

---

## 🚢 배포

### 프론트엔드 → Vercel

1. Vercel에 레포 연결 후 **Root Directory**를 `frontend`로 설정
2. Environment Variables에 `OPENAI_API_KEY` 추가
3. `next.config.ts`의 프록시 destination을 실제 백엔드 URL로 변경

```ts
destination: "https://your-backend.railway.app/api/:path*",
```

### 백엔드 → Railway / Render

```bash
# Railway CLI 예시
railway init
railway up
```

환경 변수 `OPENAI_API_KEY`, `PORT` 설정 후 배포.  
백엔드 `src/index.ts`의 CORS origin을 Vercel 도메인으로 변경:

```ts
app.use(cors({ origin: "https://your-app.vercel.app" }));
```

---

## 🛠 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 14, React 19, TypeScript, Tailwind CSS v4 |
| 백엔드 | Express, TypeScript, ts-node-dev |
| AI | OpenAI GPT-4o-mini, TTS (tts-1), Image (gpt-image-2) |
| 오디오 | Web Audio API (pitch 조절) |

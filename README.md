# AI 쇼츠 생성기

주제를 입력하면 AI가 30초 분량의 쇼츠 대본을 생성하고 음성으로 낭독해주는 앱입니다.

## 구조

```
ai-shorts-app/
├── frontend/   # Next.js 앱 (UI)
├── backend/    # Express 서버 (OpenAI API 연동)
└── README.md
```

## 시작하기

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # OPENAI_API_KEY 입력
npm run dev            # http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

## 환경 변수

`backend/.env`에 설정:

| 변수 | 설명 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API 키 |
| `PORT` | 백엔드 포트 (기본값: 4000) |

## API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/script` | POST | 대본 생성 (`topic`, `tone`) |
| `/api/tts` | POST | 음성 합성 (`text`, `voice`, `speed`) |
| `/health` | GET | 서버 상태 확인 |

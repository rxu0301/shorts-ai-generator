import { NextRequest, NextResponse } from "next/server";

const DURATION_CONFIG: Record<string, { label: string; sceneCount: number; maxTokens: number }> = {
  "10s": { label: "10초",  sceneCount: 2,  maxTokens: 300  },
  "30s": { label: "30초",  sceneCount: 5,  maxTokens: 700  },
  "60s": { label: "1분",   sceneCount: 10, maxTokens: 1400 },
};

export async function POST(req: NextRequest) {
  const { topic, tone = "재미있게", duration = "30s" } = await req.json();

  if (!topic) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
  }

  const cfg = DURATION_CONFIG[duration] ?? DURATION_CONFIG["30s"];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `당신은 숏폼 영상 대본 작가입니다.
주어진 주제로 ${cfg.label} 분량의 쇼츠 대본을 작성하세요.
- 톤: "${tone}"
- 장면(scenes) 수: 정확히 ${cfg.sceneCount}개
- 각 장면의 narration은 한 문장 이상, 자연스럽게 이어지도록 작성하세요.
- 반드시 아래 JSON 형식만 출력하고, 다른 설명·마크다운·코드블록은 절대 붙이지 마세요.

{
  "title": "영상 제목",
  "hook": "시청자를 사로잡는 첫 문장",
  "scenes": [
    { "narration": "나레이션 텍스트", "caption": "화면에 표시될 자막" }
  ]
}`,
        },
        {
          role: "user",
          content: `주제: ${topic}`,
        },
      ],
      max_tokens: cfg.maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json(
      { error: (error as any).error?.message ?? "OpenAI API error" },
      { status: response.status }
    );
  }

  const data = await response.json() as any;
  const raw: string = data.choices[0].message.content;

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    return NextResponse.json(
      { error: "모델이 올바른 JSON을 반환하지 않았습니다.", raw },
      { status: 500 }
    );
  }

  let script;
  try {
    script = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return NextResponse.json(
      { error: "JSON 파싱에 실패했습니다.", raw },
      { status: 500 }
    );
  }

  return NextResponse.json({ script });
}

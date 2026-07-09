import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt, model = "gpt-image-2", style = "realistic" } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  // 이미지 유형별 스타일 프롬프트 접두어
  const stylePrefix: Record<string, string> = {
    realistic:
      "A high-quality illustration in a realistic photographic style with cinematic lighting and rich detail. Scene: ",
    cartoon:
      "A colorful webtoon-style digital illustration with clean lines and flat vibrant colors. Scene: ",
    anime:
      "A detailed anime-style illustration with expressive characters and a vivid background. Scene: ",
  };

  const styledPrompt = (stylePrefix[style] ?? "") + prompt;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: styledPrompt,
      n: 1,
      size: "1024x1536",
      quality: "low",
    }),
  });

  if (!response.ok) {
    let errorMessage = `OpenAI image generation error (${response.status})`;
    try {
      const error = await response.json();
      errorMessage = (error as any).error?.message ?? errorMessage;
    } catch {
      // JSON 파싱 실패 시 기본 메시지 사용
    }
    return NextResponse.json({ error: errorMessage }, { status: response.status });
  }

  const data = await response.json();
  const item = data.data?.[0];

  if (!item) {
    return NextResponse.json(
      { error: "No image data returned from OpenAI" },
      { status: 500 }
    );
  }

  const dataUrl = item.b64_json
    ? `data:image/png;base64,${item.b64_json}`
    : item.url ?? null;

  if (!dataUrl) {
    return NextResponse.json(
      { error: "No image data returned from OpenAI" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: dataUrl });
}

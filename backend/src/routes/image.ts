import { Router, Request, Response } from "express";

export const imageRouter = Router();

const STYLE_PREFIX: Record<string, string> = {
  realistic:
    "A high-quality illustration in a realistic photographic style with cinematic lighting and rich detail. Scene: ",
  cartoon:
    "A colorful webtoon-style digital illustration with clean lines and flat vibrant colors. Scene: ",
  anime:
    "A detailed anime-style illustration with expressive characters and a vivid background. Scene: ",
};

imageRouter.post("/", async (req: Request, res: Response) => {
  const { prompt, model = "gpt-image-2", style = "realistic" } = req.body;

  if (!prompt) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
    return;
  }

  const styledPrompt = (STYLE_PREFIX[style] ?? "") + prompt;

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
    res.status(response.status).json({ error: errorMessage });
    return;
  }

  const data = await response.json() as any;
  const item = data.data?.[0];

  if (!item) {
    res.status(500).json({ error: "No image data returned from OpenAI" });
    return;
  }

  const url = item.b64_json
    ? `data:image/png;base64,${item.b64_json}`
    : item.url ?? null;

  if (!url) {
    res.status(500).json({ error: "No image data returned from OpenAI" });
    return;
  }

  res.json({ url });
});

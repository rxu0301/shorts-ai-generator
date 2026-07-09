import { Router, Request, Response } from "express";

export const scriptRouter = Router();

scriptRouter.post("/", async (req: Request, res: Response) => {
  const { topic, tone = "재미있게", duration = "30s" } = req.body;

  if (!topic) {
    res.status(400).json({ error: "topic is required" });
    return;
  }

  // 대본 생성은 ai-server(Flask)에서 전담
  const aiServerUrl = process.env.AI_SERVER_URL ?? "http://localhost:5000";

  let response: globalThis.Response;
  try {
    response = await fetch(`${aiServerUrl}/api/script`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, tone, duration }),
    });
  } catch (err) {
    res.status(502).json({ error: "ai-server에 연결할 수 없습니다. Flask 서버가 실행 중인지 확인하세요." });
    return;
  }

  const data = await response.json() as any;

  if (!response.ok) {
    res.status(response.status).json({ error: data.error ?? "ai-server 오류" });
    return;
  }

  res.json(data); // { script: { title, hook, scenes } }
});

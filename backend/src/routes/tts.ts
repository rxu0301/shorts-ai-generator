import { Router, Request, Response } from "express";

export const ttsRouter = Router();

ttsRouter.post("/", async (req: Request, res: Response) => {
  const { text, voice = "nova", speed = 1.0 } = req.body;

  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
    return;
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice,
      speed,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    res.status(response.status).json({ error: (error as any).error?.message ?? "OpenAI TTS error" });
    return;
  }

  const audioBuffer = await response.arrayBuffer();

  res.set({
    "Content-Type": "audio/mpeg",
    "Content-Length": audioBuffer.byteLength.toString(),
  });
  res.send(Buffer.from(audioBuffer));
});

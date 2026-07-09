import "dotenv/config";
import express from "express";
import cors from "cors";
import { scriptRouter } from "./routes/script";
import { ttsRouter } from "./routes/tts";
import { imageRouter } from "./routes/image";
import { modelsRouter } from "./routes/models";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/script", scriptRouter); // Ollama (ai-server 경유)
app.use("/api/tts", ttsRouter);       // OpenAI TTS
app.use("/api/image", imageRouter);   // OpenAI Image
app.use("/api/models", modelsRouter); // 모델 정보 (ai-server 경유)

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

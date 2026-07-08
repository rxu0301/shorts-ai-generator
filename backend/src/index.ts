import "dotenv/config";
import express from "express";
import cors from "cors";
import { scriptRouter } from "./routes/script";
import { ttsRouter } from "./routes/tts";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/script", scriptRouter);
app.use("/api/tts", ttsRouter);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

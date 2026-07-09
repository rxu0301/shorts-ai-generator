import { Router, Request, Response } from "express";

export const modelsRouter = Router();

const AI_SERVER = () => process.env.AI_SERVER_URL ?? "http://localhost:5000";

// GET /api/models/data/:mode  → ai-server /api/data/:mode
modelsRouter.get("/data/:mode", async (req: Request, res: Response) => {
  try {
    const r = await fetch(`${AI_SERVER()}/api/data/${req.params.mode}`);
    const data = await r.json();
    res.status(r.status).json(data);
  } catch {
    res.status(502).json({ error: "ai-server에 연결할 수 없습니다." });
  }
});

// GET /api/models/calc?params_b=&bits=  → ai-server /api/calc
modelsRouter.get("/calc", async (req: Request, res: Response) => {
  const { params_b, bits } = req.query;
  try {
    const r = await fetch(
      `${AI_SERVER()}/api/calc?params_b=${params_b}&bits=${bits}`
    );
    const data = await r.json();
    res.status(r.status).json(data);
  } catch {
    res.status(502).json({ error: "ai-server에 연결할 수 없습니다." });
  }
});

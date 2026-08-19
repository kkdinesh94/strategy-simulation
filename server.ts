import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Health Check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "EV Venture League Simulation" });
  });

  // Gemini AI Executive Strategic Advisor Endpoint
  app.post("/api/advisor", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(400).json({
          error: "GEMINI_API_KEY is not configured in environment.",
        });
      }

      const { prompt, context } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `You are an elite Business School Professor and Board of Directors Chairperson for the EV Venture League business simulation (patterned after ASCM Marketplace Simulation).
Analyze the provided student team decision metrics, financial numbers, target segment positioning, and balanced scorecard scores.
Provide 3 concise, highly actionable, strategic recommendations in clear markdown formatting with bullet points.
Focus on financial viability, pricing strategy, capacity planning, R&D/licensing, and segment alignment. Avoid generic fluff.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts: [{ text: `${systemInstruction}\n\nContext:\n${JSON.stringify(context, null, 2)}\n\nStudent Query: ${prompt || "Analyze our current strategy and give board guidance."}` }] }
        ]
      });

      return res.json({ advice: response.text });
    } catch (err: any) {
      console.error("Advisor API error:", err);
      return res.status(500).json({ error: err.message || "Failed to generate AI advice." });
    }
  });

  // Vite middleware setup for development vs production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EV Venture League Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

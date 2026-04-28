// ============================================================
//  AeroFit Backend — Gemini-powered Fitness Advice API
// ============================================================

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ── Load environment variables ──────────────────────────────
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Initialize Gemini ───────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are AeroFit AI, a professional and friendly fitness advisor.
Your role is to provide personalized fitness and workout advice.
Guidelines:
- Give clear, actionable advice tailored to the user's goals, fitness level, and any constraints they mention.
- Include exercise names, sets, reps, and rest times when suggesting workouts.
- Always remind users to consult a doctor before starting a new fitness program.
- Be encouraging and supportive.
- Keep responses concise but thorough — aim for 150-300 words.
- Use bullet points or numbered lists for readability.
- If the user's request is unrelated to fitness, health, or wellness, politely redirect them.`;

// ── Routes ──────────────────────────────────────────────────

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "AeroFit API", timestamp: new Date().toISOString() });
});

// POST /api/generate — Gemini fitness advice endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    // Validate input
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Please provide a non-empty 'prompt' in the request body.",
      });
    }

    // Validate API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_api_key_here") {
      return res.status(503).json({
        error: "Service Unavailable",
        message: "Gemini API key is not configured. Add it to your .env file.",
      });
    }

    // Call Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\nUser's question: ${prompt.trim()}` }],
        },
      ],
    });

    const response = result.response;
    const text = response.text();

    res.json({
      success: true,
      data: {
        advice: text,
        model: "gemini-2.0-flash",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("❌ Gemini API Error:", error.message);

    // Handle specific Gemini errors
    if (error.message?.includes("API_KEY_INVALID")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid Gemini API key. Please check your .env file.",
      });
    }

    if (error.message?.includes("429") || error.message?.includes("Too Many Requests")) {
      return res.status(429).json({
        error: "Rate Limited",
        message: "Gemini API free tier quota exceeded. Please wait a minute and try again.",
      });
    }

    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to generate fitness advice. Please try again.",
    });
  }
});

// ── Start server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏋️  AeroFit API is running on http://localhost:${PORT}`);
  console.log(`📡  Health check:  http://localhost:${PORT}/api/health`);
  console.log(`🤖  Generate:      POST http://localhost:${PORT}/api/generate\n`);
});

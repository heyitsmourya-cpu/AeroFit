// =================================================
// AeroFit Backend – Gemini-powered Fitness Advice API
// =================================================

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- Configuration ---
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors()); // Allows your React frontend to talk to this server
app.use(express.json()); // Allows the server to read JSON data from requests

// --- Initialize Gemini AI ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define a system prompt to give the AI a "personality"
const SYSTEM_PROMPT = `You are AeroFit AI, a professional and friendly fitness advisor. 
Your goal is to provide personalized fitness and workout advice. 
Guidelines:
- Give clear, actionable advice tailored to the user's goals.
- Include exercise names, sets, and reps when suggesting workouts.
- Always remind users to consult a doctor before starting a new program.
- Keep responses concise but thorough (aim for 150-300 words).`;

// --- Routes ---

// 1. Health Check (To verify the server is running)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "AeroFit API",
    timestamp: new Date().toISOString()
  });
});

// 2. Generate Workout Route
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    // Validate user input
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Please provide a non-empty 'prompt' in the request body.",
      });
    }

    // Call Gemini Model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Combine system prompt with user prompt
    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser's question: ${prompt.trim()}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      text: text,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Gemini Error:", error);

    // Specific error handling for API issues
    if (error.message?.includes("API_KEY_INVALID")) {
      return res.status(401).json({ error: "Invalid API Key in .env file." });
    }

    if (error.message?.includes("429")) {
      return res.status(429).json({ error: "Rate limit exceeded. Try again in a minute." });
    }

    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to generate fitness advice. Please try again later.",
    });
  }
});

// --- Start the Server ---
app.listen(PORT, () => {
  console.log(`\n🚀 AeroFit Brain is running!`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🤖 Generate:     POST http://localhost:${PORT}/api/generate\n`);
});
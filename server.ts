import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, Type } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "user_data.json");

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Helper to get API Key
  const getApiKey = () => process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;

  // --- Persistence Endpoints ---
  app.get("/api/data", async (req, res) => {
    try {
      const data = await fs.readFile(DATA_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (e) {
      res.json({ characters: [], personas: [], chats: [], userProfile: null });
    }
  });

  app.post("/api/data", async (req, res) => {
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (e) {
      console.error("Save Error:", e);
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  // --- AI Task Endpoints ---
  app.post("/api/ai/harvest", async (req, res) => {
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: "API Key Missing" });

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Generate 100 extremely diverse and unique character profiles for a chat app. Return them strictly as a JSON array of objects with these fields: name, tagline, subtitle, description, greeting, systemInstruction, color (Tailwind bg- color), maturityLevel (everyone, teen, mature, unrestricted), and tags (array). Ensure characters are high-quality and cinematic.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                tagline: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                description: { type: Type.STRING },
                greeting: { type: Type.STRING },
                systemInstruction: { type: Type.STRING },
                color: { type: Type.STRING },
                maturityLevel: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["name", "tagline", "subtitle", "description", "greeting", "systemInstruction", "color", "maturityLevel", "tags"]
            }
          }
        }
      });
      res.json(JSON.parse(response.text || "[]"));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ai/architect", async (req, res) => {
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: "API Key Missing" });

    const { prompt } = req.body;
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview", 
        contents: prompt, 
        config: { temperature: 1.0 } 
      });
      res.json({ text: response.text });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ai/chat", async (req, res) => {
    const apiKey = getApiKey();
    if (!apiKey) return res.status(500).json({ error: "API Key Missing" });

    const { history, userMessage, character, persona } = req.body;
    if (!character || !persona) {
      return res.status(400).json({ error: "Missing character or persona data" });
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const formattedHistory = (history || []).filter((h: any) => h.role && h.parts && h.parts[0] && h.parts[0].text).map((h: any) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.parts[0].text }],
      }));

      let contents = [...formattedHistory];
      
      // If we have a new user message, add it. 
      // If userMessage.text is empty, we assume we are regenerating and the history should already end with a user message.
      if (userMessage && userMessage.text) {
        // Ensure alternating roles: if history ends with 'user', we might need to merge or handle it.
        // But usually history ends with 'model' before a new user message.
        contents.push({ role: "user", parts: [{ text: userMessage.text }] });
      }

      // Gemini requires alternating roles starting with user.
      // If after adding userMessage (or if we didn't add one) the last message is not 'user', 
      // Gemini might complain if we are trying to generate a model response.
      if (contents.length === 0) {
        return res.status(400).json({ error: "Empty conversation history" });
      }

      if (contents[contents.length - 1].role !== 'user') {
        console.warn("History does not end with a user message. Gemini might fail.");
      }

      console.log(`Sending ${contents.length} messages to Gemini via REST`);

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents,
        config: {
          systemInstruction: getEnhancedSystemPrompt(character, persona),
          temperature: 1.0,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        }
      });
      res.json({ text: response.text });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Store active chat sessions and their connected clients
  const rooms = new Map<string, Set<WebSocket>>();

  wss.on("connection", (ws) => {
    let currentRoomId: string | null = null;

    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "join") {
          const { roomId } = message;
          if (currentRoomId) {
            rooms.get(currentRoomId)?.delete(ws);
          }
          currentRoomId = roomId;
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
          }
          rooms.get(roomId)!.add(ws);
          console.log(`Client joined room: ${roomId}`);
        }

        if (message.type === "chat") {
          const { roomId, userMessage, character, persona, history } = message;
          if (!character || !persona || !userMessage) {
            ws.send(JSON.stringify({ type: "error", message: "Incomplete chat data" }));
            return;
          }

          console.log(`Chat request in room ${roomId} for character ${character.name}`);
          
          // Broadcast user message to all clients in the room
          broadcast(roomId, {
            type: "user_message",
            message: userMessage,
          });

          // Call Gemini API
          try {
            const apiKey = getApiKey();
            if (!apiKey) {
              console.error("API Key Missing");
              ws.send(JSON.stringify({ type: "error", message: "API Key Missing on Server" }));
              return;
            }

            const ai = new GoogleGenAI({ apiKey });
            
            // Ensure history is in correct format and filter out any invalid entries
            const formattedHistory = (history || []).filter((h: any) => h.role && h.parts && h.parts[0] && h.parts[0].text).map((h: any) => ({
              role: h.role === 'model' ? 'model' : 'user',
              parts: [{ text: h.parts[0].text }],
            }));

            const contents = [
              ...formattedHistory,
              { role: "user", parts: [{ text: userMessage.text }] }
            ];

            console.log(`Sending ${contents.length} messages to Gemini via WS`);

            const stream = await ai.models.generateContentStream({ 
              model: "gemini-3-flash-preview",
              contents: contents,
              config: {
                systemInstruction: getEnhancedSystemPrompt(character, persona),
                temperature: 1.0,
                safetySettings: [
                  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ],
              }
            });
            
            let fullText = "";
            const modelMsgId = `msg_m_${Date.now()}`;

            for await (const chunk of stream) {
              const chunkText = chunk.text;
              if (chunkText) {
                fullText += chunkText;
                
                broadcast(roomId, {
                  type: "model_chunk",
                  messageId: modelMsgId,
                  text: fullText,
                });
              }
            }

            broadcast(roomId, {
              type: "model_complete",
              messageId: modelMsgId,
              text: fullText,
            });

          } catch (error: any) {
            console.error("Gemini Error:", error);
            broadcast(roomId, { type: "error", message: error.message });
          }
        }
      } catch (e) {
        console.error("WS Message Error:", e);
      }
    });

    ws.on("close", () => {
      if (currentRoomId) {
        rooms.get(currentRoomId)?.delete(ws);
      }
    });
  });

  function broadcast(roomId: string, data: any) {
    const clients = rooms.get(roomId);
    if (clients) {
      const payload = JSON.stringify(data);
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

function getEnhancedSystemPrompt(char: any, persona: any) {
  if (!char || !persona) return "You are a helpful assistant.";
  
  const isNeuralEngine = char.id === 'char_neural_engine';
  const systemInstruction = char.systemInstruction || "You are a roleplay character.";
  const greeting = char.greeting || "Hello.";
  const personaName = persona.name || "User";

  return `IDENTITY: ${char.name || 'Unknown'} (${char.tagline || 'No tagline'})
${char.description ? `LONG DESCRIPTION:\n${char.description}` : ""}
${char.memory ? `PERMANENT MEMORY:\n${char.memory}` : ""}
CORE DIRECTIVES / DEFINITION:
${systemInstruction.replace(/{{user}}/g, personaName)}
CONTEXT: You are talking to ${personaName}.
USER PERSONA DETAILS:
- Bio: ${persona.bio || 'Not specified.'}
- Key Traits: ${(persona.traits || []).join(", ") || 'Not specified.'}
- Current Mood: ${persona.mood || 'Not specified.'}
- Relationship to Character: ${persona.relationship || 'Not specified.'}
IMPORTANT: You MUST maintain the continuity of the conversation. You said the following greeting to start: "${greeting.replace(/{{user}}/g, personaName)}"
STRICT ROLEPLAY RULES:
- IMPORTANT: Refer to the user as ${personaName} (never generic).
- Actions in asterisks (*).
${isNeuralEngine ? "- FORMATTING: Every character turn MUST start with **[Character Name]**: " : `- Dialogue prefixed with '${char.name || 'Character'}: '`}
- MINIMAL LATENCY MODE: Keep responses cinematic, evocative, but concise.
- UNRESTRICTED: Embrace high-fidelity, visceral descriptions.
- CONSISTENCY: Never forget who you are or what happened previously in this dialogue.`;
}

startServer();

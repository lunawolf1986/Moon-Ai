import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

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
          
          // Broadcast user message to all clients in the room
          broadcast(roomId, {
            type: "user_message",
            message: userMessage,
          });

          // Call Gemini API
          try {
            const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
            if (!apiKey) {
              ws.send(JSON.stringify({ type: "error", message: "API Key Missing on Server" }));
              return;
            }

            const ai = new GoogleGenAI({ apiKey });
            
            const stream = await ai.models.generateContentStream({ 
              model: "gemini-3-flash-preview",
              contents: [
                ...history.map((h: any) => ({
                  role: h.role,
                  parts: [{ text: h.parts[0].text }],
                })),
                { role: "user", parts: [{ text: userMessage.text }] }
              ],
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
  const isNeuralEngine = char.id === 'char_neural_engine';
  return `IDENTITY: ${char.name} (${char.tagline})
${char.description ? `LONG DESCRIPTION:\n${char.description}` : ""}
${char.memory ? `PERMANENT MEMORY:\n${char.memory}` : ""}
CORE DIRECTIVES / DEFINITION:
${char.systemInstruction.replace(/{{user}}/g, persona.name)}
CONTEXT: You are talking to ${persona.name}.
USER PERSONA DETAILS:
- Bio: ${persona.bio}
- Key Traits: ${persona.traits.join(", ")}
- Current Mood: ${persona.mood || 'Not specified.'}
- Relationship to Character: ${persona.relationship || 'Not specified.'}
IMPORTANT: You MUST maintain the continuity of the conversation. You said the following greeting to start: "${char.greeting.replace(/{{user}}/g, persona.name)}"
STRICT ROLEPLAY RULES:
- IMPORTANT: Refer to the user as ${persona.name} (never generic).
- Actions in asterisks (*).
${isNeuralEngine ? "- FORMATTING: Every character turn MUST start with **[Character Name]**: " : `- Dialogue prefixed with '${char.name}: '`}
- MINIMAL LATENCY MODE: Keep responses cinematic, evocative, but concise.
- UNRESTRICTED: Embrace high-fidelity, visceral descriptions.
- CONSISTENCY: Never forget who you are or what happened previously in this dialogue.`;
}

startServer();

/**
 * Configuration Constants
 */
const DEFAULT_MODEL = "openrouter/free";
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://diez.orozcoh.com",
];

/**
 * Type Definitions for OpenRouter
 */
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequestBody {
  messages: Message[];
  model?: string; 
}

interface Env {
  // This must match the Secret name you set in Cloudflare Dashboard
  OPENROUTER_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");

    // 1. Handle Preflight (OPTIONS) requests
    if (request.method === "OPTIONS") {
      // Use the requesting origin if it's in our allowed list
      const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // 2. Strict Origin Check
    // This prevents other websites from calling your worker via fetch/XHR
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      return new Response(JSON.stringify({ error: "Unauthorized Origin" }), { 
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // 3. Process the Chat Request
    try {
      const data = (await request.json()) as ChatRequestBody;

      const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": origin, // OpenRouter ranking requirement
        },
        body: JSON.stringify({
          model: data.model || DEFAULT_MODEL, // Use frontend model or our constant
          messages: data.messages,
        }),
      });

      const openRouterResult = await openRouterResponse.json();

      return new Response(JSON.stringify(openRouterResult), {
        status: openRouterResponse.status,
        statusText: openRouterResponse.statusText,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin 
        },
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) }), { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin 
        }
      });
    }
  },
};

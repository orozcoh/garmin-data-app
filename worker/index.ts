/**
 * Configuration Constants
 */
const DEFAULT_MODEL = "openrouter/free";
//const ALLOWED_ORIGIN = "https://diez.orozcoh.com"; 
const ALLOWED_ORIGIN = "http://localhost:5173";
//const ALLOWED_ORIGIN = "*";

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
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // 2. Strict Origin Check
    // This prevents other websites from calling your worker via fetch/XHR
    if (origin !== ALLOWED_ORIGIN) {
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
          "HTTP-Referer": ALLOWED_ORIGIN, // OpenRouter ranking requirement
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
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN 
        },
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) }), { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN 
        }
      });
    }
  },
};

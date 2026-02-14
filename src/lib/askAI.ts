// Proxy API KEY handler
  
const url = import.meta.env.VITE_CLOUDFLARE_WORKER_URL || "http://localhost:8787";

export async function askAI(message: string, model: string = "openrouter/free"): Promise<string> {
  const headers = {
    "Content-Type": "application/json",
  };

  const data = {
    "model": model,
    "messages": [
      {"role": "user", "content": message}
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI service error (${response.status}): ${errorText}`);
  }
  
  const result = await response.json();
  
  if (!result.choices?.[0]?.message?.content) {
    console.error('Invalid AI response structure:', result);
    throw new Error('Invalid response from AI service: missing choices[0].message.content');
  }
  
  return result.choices[0].message.content as string;
}

// Test
/* (async () => {
  try {
    const reply = await askAI("What is HKDF?");
    console.log(reply);
  } catch (error) {
    console.error("Error:", error);
  }
})(); */

/**
 * Universal Client-Side & Vercel-Ready API Key Injection & Live Execution Engine
 *
 * Designed to work 100% in client-side browser environments (Vercel static SPA,
 * Netlify, GitHub Pages, or local Vite dev) with zero server proxy dependency.
 * Persists keys directly in Browser LocalStorage.
 */

import {
  AiProvider,
  detectAiProvider,
  PROVIDERS,
  updateActiveProfileApiKey,
  getActiveProfile,
  getStoredProfiles,
  STORAGE_API_KEY_CONFIGURED
} from "./userProfiles";

export interface KeyValidationResult {
  valid: boolean;
  provider: AiProvider;
  liveTestResponse: string;
  error?: string;
}

/**
 * Sanitizes input key by stripping quotes, whitespace, and invisible characters
 */
export function sanitizeApiKey(raw: string): string {
  return (raw || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[\r\n\t]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

/**
 * Retrieves the currently active user-injected API key from LocalStorage
 */
export function getInjectedApiKey(): string {
  if (typeof localStorage === "undefined") return "";
  const key = (
    localStorage.getItem("user_gemini_api_key") ||
    localStorage.getItem("custom_gemini_api_key") ||
    ""
  ).trim();
  return sanitizeApiKey(key);
}

/**
 * Checks if user has injected a valid key
 */
export function hasInjectedApiKey(): boolean {
  const key = getInjectedApiKey();
  return Boolean(key && key.length >= 10);
}

/**
 * Clears injected key from LocalStorage and active user profile
 */
export function clearInjectedApiKey(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("user_gemini_api_key");
    localStorage.removeItem("custom_gemini_api_key");
    localStorage.setItem(STORAGE_API_KEY_CONFIGURED, "false");
  }
  updateActiveProfileApiKey("");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tune-api-key-updated", { detail: { apiKey: "" } }));
    window.dispatchEvent(new CustomEvent("tune_api_key_status_changed", { detail: { hasKey: false } }));
    window.dispatchEvent(new Event("storage"));
  }
}

/**
 * Direct Client-Side Gemini Validation & Live Test
 * Runs directly in user's browser, works seamlessly on Vercel deployments!
 */
async function testGeminiDirect(apiKey: string): Promise<string> {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError = "";

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: "Say in exactly one warm, short sentence in Bengali that your AI engine is live, active, and ready to assist via injected key."
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 60
          }
        })
      });

      if (res.ok) {
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      } else {
        const errJson = await res.json().catch(() => null);
        lastError = errJson?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
      }
    } catch (e: any) {
      lastError = e?.message || "Network error while connecting to Google Gemini.";
    }
  }

  throw new Error(lastError || "Gemini API key verification failed.");
}

/**
 * Direct Client-Side OpenRouter Validation & Live Test
 */
async function testOpenRouterDirect(apiKey: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://tune.ai",
      "X-Title": "Remix Tune"
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: "Say in exactly one warm short sentence in Bengali that OpenRouter is live and ready."
        }
      ],
      max_tokens: 50
    })
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    throw new Error(errJson?.error?.message || `OpenRouter HTTP ${res.status}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("No response generated from OpenRouter.");
  return text.trim();
}

/**
 * Direct Client-Side OpenAI Validation & Live Test
 */
async function testOpenAIDirect(apiKey: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: "Say in 1 short sentence in Bengali that OpenAI ChatGPT is live and ready."
        }
      ],
      max_tokens: 50
    })
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    throw new Error(errJson?.error?.message || `OpenAI HTTP ${res.status}`);
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text) throw new Error("No response generated from OpenAI.");
  return text.trim();
}

/**
 * Universal Validate, Test Live, and Save Key
 * First tries backend proxy `/api/validate-key` (if running locally or serverful).
 * If the server is absent or returns 404 (e.g. on Vercel static deployment),
 * it automatically switches seamlessly to direct browser client-side execution!
 */
export async function validateAndTestKeyLive(
  rawKey: string,
  requestedProvider?: AiProvider | "auto"
): Promise<KeyValidationResult> {
  const cleanKey = sanitizeApiKey(rawKey);

  if (!cleanKey) {
    return {
      valid: false,
      provider: "gemini",
      liveTestResponse: "",
      error: "দয়া করে আপনার API Key প্রদান করুন।"
    };
  }

  if (cleanKey.startsWith("ya29.") || cleanKey.startsWith("Bearer ") || cleanKey.includes("eyJ")) {
    return {
      valid: false,
      provider: "gemini",
      liveTestResponse: "",
      error: "এটি একটি সাময়িক OAuth টোকেন, API Key নয়। দয়া করে আপনার AI Studio Gemini বা AI API Key প্রদান করুন।"
    };
  }

  if (cleanKey.length < 10) {
    return {
      valid: false,
      provider: "gemini",
      liveTestResponse: "",
      error: "API Key খুব ছোট বা অসম্পূর্ণ।"
    };
  }

  const targetProvider: AiProvider =
    !requestedProvider || requestedProvider === "auto"
      ? detectAiProvider(cleanKey)
      : requestedProvider;

  let liveText = "";
  let validated = false;

  // 1. Try local server endpoint if available
  try {
    const serverRes = await fetch("/api/validate-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: cleanKey, provider: targetProvider }),
    });

    const contentType = serverRes.headers.get("content-type") || "";
    if (serverRes.ok && contentType.includes("application/json")) {
      const data = await serverRes.json();
      if (data.valid) {
        validated = true;
        liveText = data.liveTestResponse || "API Key সক্রিয় এবং লাইভ কানেক্টেড!";
      }
    }
  } catch {
    // Server proxy unreachable or running static (e.g. Vercel) - proceed to client-side direct
  }

  // 2. Direct client-side validation fallback for Vercel & static deployments
  if (!validated) {
    try {
      if (targetProvider === "gemini") {
        liveText = await testGeminiDirect(cleanKey);
        validated = true;
      } else if (targetProvider === "openrouter") {
        liveText = await testOpenRouterDirect(cleanKey);
        validated = true;
      } else if (targetProvider === "openai") {
        liveText = await testOpenAIDirect(cleanKey);
        validated = true;
      } else {
        // Fallback to Gemini direct
        liveText = await testGeminiDirect(cleanKey);
        validated = true;
      }
    } catch (directErr: any) {
      const errMsg = directErr?.message || "API Key যাচাই করা যায়নি।";
      return {
        valid: false,
        provider: targetProvider,
        liveTestResponse: "",
        error: errMsg
      };
    }
  }

  // 3. Successfully validated! Save to LocalStorage and user profile
  if (validated) {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("user_gemini_api_key", cleanKey);
      localStorage.setItem("custom_gemini_api_key", cleanKey);
      localStorage.setItem("tune_api_provider", targetProvider);
      localStorage.setItem(STORAGE_API_KEY_CONFIGURED, "true");
    }

    updateActiveProfileApiKey(cleanKey, targetProvider);

    // Broadcast across windows and components
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("tune-api-key-updated", {
          detail: { apiKey: cleanKey, provider: targetProvider }
        })
      );
      window.dispatchEvent(
        new CustomEvent("tune_api_key_status_changed", {
          detail: { hasKey: true, provider: targetProvider }
        })
      );
      window.dispatchEvent(new Event("storage"));
    }

    return {
      valid: true,
      provider: targetProvider,
      liveTestResponse: liveText || "API Key সফলভাবে যাচাই ও সক্রিয় হয়েছে!"
    };
  }

  return {
    valid: false,
    provider: targetProvider,
    liveTestResponse: "",
    error: "API Key ভেরিফিকেশন ব্যর্থ হয়েছে।"
  };
}

/**
 * Generate a live AI response using the injected key directly in the browser
 * Works anywhere (Vercel, local, mobile)!
 */
export async function generateLiveAIResponse(prompt: string): Promise<string> {
  const apiKey = getInjectedApiKey();
  if (!apiKey) {
    throw new Error("কোনো API Key ইনজেক্ট করা নেই। দয়া করে সাইড প্যানেল থেকে API Key যোগ করুন।");
  }

  const provider = (typeof localStorage !== "undefined"
    ? (localStorage.getItem("tune_api_provider") as AiProvider)
    : null) || detectAiProvider(apiKey);

  if (provider === "gemini") {
    const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
    for (const m of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 250 }
          })
        });
        if (res.ok) {
          const json = await res.json();
          const reply = json?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) return reply.trim();
        }
      } catch {}
    }
  } else if (provider === "openrouter") {
    return await testOpenRouterDirect(apiKey);
  } else if (provider === "openai") {
    return await testOpenAIDirect(apiKey);
  }

  // Default fallback to Gemini
  return await testGeminiDirect(apiKey);
}

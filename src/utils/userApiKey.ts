/**
 * Client-Side BYOK (Bring Your Own Key) Storage & Retrieval Utility
 * Strictly client-side using browser localStorage with zero server costs or CORS issues.
 */

export function saveUserApiKey(key: string): boolean {
  if (!key || key.trim() === "") {
    return false;
  }
  const clean = key.trim().replace(/^["']|["']$/g, "").trim();
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("user_gemini_api_key", clean);
    localStorage.setItem("custom_gemini_api_key", clean);
    localStorage.setItem("tune_api_key_configured", "true");
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("tune-api-key-updated", { detail: { apiKey: clean } })
      );
    }
  }
  return true;
}

export function getUserApiKey(): string {
  if (typeof localStorage === "undefined") return "";
  return (
    localStorage.getItem("user_gemini_api_key") ||
    localStorage.getItem("custom_gemini_api_key") ||
    ""
  ).trim();
}

export function hasUserApiKey(): boolean {
  const key = getUserApiKey();
  return Boolean(key && key.length >= 10);
}

export function clearUserApiKey(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("user_gemini_api_key");
    localStorage.removeItem("custom_gemini_api_key");
    localStorage.setItem("tune_api_key_configured", "false");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tune-api-key-updated", { detail: { apiKey: "" } }));
    }
  }
}

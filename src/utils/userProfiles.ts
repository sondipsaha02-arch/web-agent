export type AiProvider = "gemini" | "openrouter" | "openai" | "anthropic" | "grok";

export interface ProviderMeta {
  id: AiProvider;
  name: string;
  badge: string;
  placeholder: string;
  docUrl: string;
  defaultModel: string;
}

export const PROVIDERS: Record<AiProvider, ProviderMeta> = {
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    badge: "Gemini",
    placeholder: "Paste Gemini API Key (AIzaSy...)",
    docUrl: "https://aistudio.google.com/app/apikey",
    defaultModel: "gemini-2.5-flash",
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    badge: "OpenRouter",
    placeholder: "Paste OpenRouter Key (sk-or-... or AQ....)",
    docUrl: "https://openrouter.ai/keys",
    defaultModel: "google/gemini-2.0-flash-exp:free",
  },
  openai: {
    id: "openai",
    name: "ChatGPT (OpenAI)",
    badge: "ChatGPT",
    placeholder: "Paste OpenAI Key (sk-proj-... or sk-...)",
    docUrl: "https://platform.openai.com/api-keys",
    defaultModel: "gpt-4o-mini",
  },
  anthropic: {
    id: "anthropic",
    name: "Claude (Anthropic)",
    badge: "Claude",
    placeholder: "Paste Claude Key (sk-ant-...)",
    docUrl: "https://console.anthropic.com/settings/keys",
    defaultModel: "claude-3-haiku-20240307",
  },
  grok: {
    id: "grok",
    name: "xAI Grok",
    badge: "Grok",
    placeholder: "Paste xAI Grok Key (xai-...)",
    docUrl: "https://console.x.ai/",
    defaultModel: "grok-beta",
  },
};

export function detectAiProvider(key: string): AiProvider {
  const k = (key || "").trim();
  if (k.startsWith("sk-or-") || k.startsWith("AQ.") || k.includes(".openrouter")) return "openrouter";
  if (k.startsWith("sk-ant-")) return "anthropic";
  if (k.startsWith("xai-")) return "grok";
  if (k.startsWith("AIzaSy")) return "gemini";
  if (k.startsWith("sk-proj-") || (k.startsWith("sk-") && !k.startsWith("sk-or-"))) return "openai";
  // Default to openrouter if unknown or starts with AQ
  return "openrouter";
}

export interface UserAccountProfile {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  apiKey: string;
  provider?: AiProvider;
  model?: string;
  createdAt: string;
  isOwner?: boolean;
}

const STORAGE_PROFILES_KEY = "tune_user_profiles_v2";
const STORAGE_ACTIVE_PROFILE_KEY = "tune_active_profile_id_v2";
export const STORAGE_API_KEY_CONFIGURED = "tune_api_key_configured";

export const getStoredProfiles = (): UserAccountProfile[] => {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to parse user profiles:", e);
  }

  // Initial migration or fallback: Check if existing user_gemini_api_key or custom_gemini_api_key exists
  const existingKey = typeof localStorage !== "undefined"
    ? (localStorage.getItem("user_gemini_api_key") || localStorage.getItem("custom_gemini_api_key") || "").trim()
    : "";
  const existingProvider = typeof localStorage !== "undefined" ? (localStorage.getItem("tune_api_provider") as AiProvider) : undefined;
  const existingMemory = typeof localStorage !== "undefined" ? localStorage.getItem("tune_long_term_memory") : null;
  let ownerName = "Sondip";
  if (existingMemory) {
    try {
      const m = JSON.parse(existingMemory);
      if (m?.user_profile?.name) ownerName = m.user_profile.name;
    } catch {}
  }

  const initialProfiles: UserAccountProfile[] = [
    {
      id: "profile_sondip_primary",
      name: ownerName,
      role: "Primary Owner",
      avatarColor: "from-cyan-500 to-blue-600",
      apiKey: existingKey,
      provider: existingProvider || (existingKey ? detectAiProvider(existingKey) : "gemini"),
      createdAt: new Date().toISOString(),
      isOwner: true,
    }
  ];

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(initialProfiles));
    localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, initialProfiles[0].id);
    if (existingKey) {
      localStorage.setItem("user_gemini_api_key", existingKey);
      localStorage.setItem("custom_gemini_api_key", existingKey);
      localStorage.setItem(STORAGE_API_KEY_CONFIGURED, "true");
      localStorage.setItem("tune_api_provider", initialProfiles[0].provider || "gemini");
    }
  }
  return initialProfiles;
};

export const getActiveProfile = (): UserAccountProfile => {
  const profiles = getStoredProfiles();
  if (typeof localStorage === "undefined" || profiles.length === 0) {
    return {
      id: "profile_default",
      name: "User",
      role: "Primary User",
      avatarColor: "from-cyan-500 to-blue-600",
      apiKey: "",
      provider: "gemini",
      createdAt: new Date().toISOString(),
      isOwner: true
    };
  }

  const activeId = localStorage.getItem(STORAGE_ACTIVE_PROFILE_KEY);
  const found = profiles.find((p) => p.id === activeId);
  return found || profiles[0];
};

export const switchActiveProfile = (profileId: string): UserAccountProfile => {
  const profiles = getStoredProfiles();
  const target = profiles.find((p) => p.id === profileId);
  if (!target) return getActiveProfile();

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, target.id);
    // Sync user_gemini_api_key, custom_gemini_api_key and provider with this profile's key
    if (target.apiKey) {
      localStorage.setItem("user_gemini_api_key", target.apiKey);
      localStorage.setItem("custom_gemini_api_key", target.apiKey);
      localStorage.setItem("tune_api_provider", target.provider || detectAiProvider(target.apiKey));
      localStorage.setItem(STORAGE_API_KEY_CONFIGURED, "true");
    } else {
      localStorage.removeItem("user_gemini_api_key");
      localStorage.removeItem("custom_gemini_api_key");
      localStorage.removeItem("tune_api_provider");
    }
  }

  // Dispatch events to notify the system
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tune-profile-changed", { detail: target }));
    window.dispatchEvent(new CustomEvent("tune-api-key-updated", { detail: { apiKey: target.apiKey || "", provider: target.provider } }));
  }

  return target;
};

export const createNewProfile = (name: string, role = "Member", apiKey = "", provider?: AiProvider): UserAccountProfile => {
  const profiles = getStoredProfiles();
  const colors = [
    "from-purple-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-pink-500 to-rose-600",
    "from-cyan-500 to-blue-600",
    "from-violet-500 to-fuchsia-600",
    "from-sky-500 to-cyan-600",
    "from-teal-500 to-emerald-600"
  ];
  const color = colors[profiles.length % colors.length];
  
  const cleanKey = apiKey.trim().replace(/^["']|["']$/g, "");
  const detected = provider || (cleanKey ? detectAiProvider(cleanKey) : "openrouter");
  const newProfile: UserAccountProfile = {
    id: "profile_" + Math.random().toString(36).substring(2, 9),
    name: name.trim() || `User ${profiles.length + 1}`,
    role,
    avatarColor: color,
    apiKey: cleanKey,
    provider: detected,
    createdAt: new Date().toISOString(),
    isOwner: false,
  };

  const updated = [...profiles, newProfile];
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(updated));
  }
  
  // Automatically switch to the newly created profile
  switchActiveProfile(newProfile.id);
  return newProfile;
};

export const updateActiveProfileApiKey = (apiKey: string, provider?: AiProvider): UserAccountProfile => {
  const cleanKey = apiKey.trim().replace(/^["']|["']$/g, "");
  const profiles = getStoredProfiles();
  const active = getActiveProfile();
  const activeProvider = provider || (cleanKey ? detectAiProvider(cleanKey) : (active.provider || "gemini"));

  const updatedProfiles = profiles.map((p) => {
    if (p.id === active.id) {
      return { ...p, apiKey: cleanKey, provider: activeProvider };
    }
    return p;
  });

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(updatedProfiles));
    if (cleanKey) {
      localStorage.setItem("user_gemini_api_key", cleanKey);
      localStorage.setItem("custom_gemini_api_key", cleanKey);
      localStorage.setItem("tune_api_provider", activeProvider);
      localStorage.setItem(STORAGE_API_KEY_CONFIGURED, "true");
    } else {
      localStorage.removeItem("user_gemini_api_key");
      localStorage.removeItem("custom_gemini_api_key");
      localStorage.removeItem("tune_api_provider");
    }
  }

  const updatedActive = { ...active, apiKey: cleanKey, provider: activeProvider };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tune-profile-changed", { detail: updatedActive }));
    window.dispatchEvent(new CustomEvent("tune-api-key-updated", { detail: { apiKey: cleanKey, provider: activeProvider } }));
  }

  return updatedActive;
};

export const deleteUserProfile = (profileId: string): boolean => {
  const profiles = getStoredProfiles();
  if (profiles.length <= 1) return false; // Keep at least one profile
  
  const remaining = profiles.filter((p) => p.id !== profileId);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(remaining));
  }

  const activeId = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_ACTIVE_PROFILE_KEY) : null;
  if (activeId === profileId) {
    switchActiveProfile(remaining[0].id);
  } else {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tune-profile-changed", { detail: getActiveProfile() }));
    }
  }
  return true;
};

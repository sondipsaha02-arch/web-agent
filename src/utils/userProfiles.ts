export interface UserAccountProfile {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  apiKey: string;
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

  // Initial migration or fallback: Check if existing custom_gemini_api_key exists
  const existingKey = typeof localStorage !== "undefined" ? (localStorage.getItem("custom_gemini_api_key") || "").trim() : "";
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
      createdAt: new Date().toISOString(),
      isOwner: true,
    }
  ];

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(initialProfiles));
    localStorage.setItem(STORAGE_ACTIVE_PROFILE_KEY, initialProfiles[0].id);
    if (existingKey) {
      localStorage.setItem(STORAGE_API_KEY_CONFIGURED, "true");
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
    // Sync custom_gemini_api_key with this profile's key
    if (target.apiKey) {
      localStorage.setItem("custom_gemini_api_key", target.apiKey);
      localStorage.setItem(STORAGE_API_KEY_CONFIGURED, "true");
    } else {
      localStorage.removeItem("custom_gemini_api_key");
    }
  }

  // Dispatch events to notify the system
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tune-profile-changed", { detail: target }));
    window.dispatchEvent(new CustomEvent("tune-api-key-updated", { detail: target.apiKey || "" }));
  }

  return target;
};

export const createNewProfile = (name: string, role = "Member", apiKey = ""): UserAccountProfile => {
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
  const newProfile: UserAccountProfile = {
    id: "profile_" + Math.random().toString(36).substring(2, 9),
    name: name.trim() || `User ${profiles.length + 1}`,
    role,
    avatarColor: color,
    apiKey: cleanKey,
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

export const updateActiveProfileApiKey = (apiKey: string): UserAccountProfile => {
  const cleanKey = apiKey.trim().replace(/^["']|["']$/g, "");
  const profiles = getStoredProfiles();
  const active = getActiveProfile();

  const updatedProfiles = profiles.map((p) => {
    if (p.id === active.id) {
      return { ...p, apiKey: cleanKey };
    }
    return p;
  });

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(updatedProfiles));
    if (cleanKey) {
      localStorage.setItem("custom_gemini_api_key", cleanKey);
      localStorage.setItem(STORAGE_API_KEY_CONFIGURED, "true");
    } else {
      localStorage.removeItem("custom_gemini_api_key");
    }
  }

  const updatedActive = { ...active, apiKey: cleanKey };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("tune-profile-changed", { detail: updatedActive }));
    window.dispatchEvent(new CustomEvent("tune-api-key-updated", { detail: cleanKey }));
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

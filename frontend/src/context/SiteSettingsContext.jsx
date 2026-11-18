import { useCallback, useEffect, useMemo, useState } from "react";
import { siteSettingsDefaults } from "./siteSettingsDefaults";
import { SiteSettingsContext } from "./siteSettingsContext";
import { API_BASE } from "../config";

const SETTINGS_CACHE_KEY = "kmes_site_settings_cache_v2";

function getInitialSettings() {
  if (typeof window !== "undefined") {
    try {
      const cached = window.localStorage.getItem(SETTINGS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          return { ...siteSettingsDefaults, ...parsed };
        }
      }
    } catch {
      // Ignore localStorage errors (e.g. private mode, quota)
    }
  }
  return siteSettingsDefaults;
}

function persistSettings(data) {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data));
    } catch {
      // Ignore localStorage write failures
    }
  }
}

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(getInitialSettings);
  const [loading, setLoading] = useState(true);

  const applySettings = useCallback((incoming) => {
    setSettings((prev) => {
      const merged = { ...siteSettingsDefaults, ...prev, ...incoming };
      persistSettings(merged);
      return merged;
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/site-settings`);
      if (!res.ok) {
        throw new Error(`Failed to fetch site settings: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data?.success && data.data) {
        applySettings(data.data);
      }
    } catch (error) {
      console.error("Failed to load site settings", error);
    } finally {
      setLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const res = await fetch(`${API_BASE}/api/site-settings`);
        if (!res.ok) {
          throw new Error(`Failed to fetch site settings: HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled && data?.success && data.data) {
          applySettings(data.data);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load site settings", error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [applySettings]);

  const value = useMemo(
    () => ({ settings, loading, refresh }),
    [settings, loading, refresh]
  );

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

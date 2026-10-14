import { useCallback, useEffect, useMemo, useState } from "react";
import { siteSettingsDefaults } from "./siteSettingsDefaults";
import { SiteSettingsContext } from "./siteSettingsContext";

import { API_BASE } from "../config";

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(siteSettingsDefaults);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/site-settings`);
      if (!res.ok) {
        throw new Error(`Failed to fetch site settings: HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data?.success && data.data) {
        setSettings({ ...siteSettingsDefaults, ...data.data });
      }
    } catch (error) {
      console.error("Failed to load site settings", error);
    } finally {
      setLoading(false);
    }
  }, []);

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
          setSettings({ ...siteSettingsDefaults, ...data.data });
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
  }, []);

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

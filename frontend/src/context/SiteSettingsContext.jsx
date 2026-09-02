import { createContext, useContext, useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const siteSettingsDefaults = {
  schoolName: "Kaseni Model Secondary English School",
  shortName: "KMES",
  logoUrl: "",
  heroImage:
    "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1600&q=80",
  heroEyebrow: "Est. 2059 B.S.",
  heroTitle: "Kaseni Model Secondary English School",
  heroDescription:
    "Nurturing academic excellence, character, and confidence from Nursery to Grade 10 in a modern, English-medium learning environment.",
  footerDescription:
    "An academic institution committed to quality English-medium education from Nursery to Grade 10.",
  address: "Kaseni, Nepal",
  phone: "+977-XXXXXXXXXX",
  email: "info@kmes.edu.np",
  facebookUrl: "https://www.facebook.com/61554117025008",
  principalName: "Principal",
  principalTitle: "Principal",
  principalPhoto: "",
  principalMessage:
    "Our school is committed to building confident learners, responsible citizens, and compassionate leaders through quality education and character development.",
  directorName: "Director",
  directorTitle: "Director",
  directorPhoto: "",
  directorMessage:
    "We believe meaningful education blends academic excellence with discipline, creativity, and community spirit to prepare students for the future.",
};

const SiteSettingsContext = createContext({
  settings: siteSettingsDefaults,
  loading: true,
  refresh: async () => {},
});

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(siteSettingsDefaults);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/site-settings`);
      const data = await res.json();
      if (data?.success && data.data) {
        setSettings({ ...siteSettingsDefaults, ...data.data });
      }
    } catch (error) {
      console.error("Failed to load site settings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(
    () => ({ settings, loading, refresh }),
    [settings, loading]
  );

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

import { createContext } from "react";
import { siteSettingsDefaults } from "./siteSettingsDefaults";

export const SiteSettingsContext = createContext({
  settings: siteSettingsDefaults,
  loading: true,
  refresh: async () => {},
});

export { SiteSettingsProvider } from "./SiteSettingsContext.jsx";

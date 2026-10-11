import { useContext } from "react";
import { SiteSettingsContext } from "./siteSettingsContext";

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

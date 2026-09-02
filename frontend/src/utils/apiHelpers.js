// Utility functions for fetching content from the backend API
// Replaces hardcoded static data files

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function fetchAPI(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch from ${endpoint}: ${response.status}`);
    }
    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error.message);
    throw error;
  }
}

// Export individual fetchers for each resource type
export async function fetchNotices(category = null) {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchAPI(`/api/notices${query}`);
}

export async function fetchNotice(id) {
  return fetchAPI(`/api/notices/${id}`);
}

export async function fetchEvents() {
  return fetchAPI("/api/events");
}

export async function fetchEvent(id) {
  return fetchAPI(`/api/events/${id}`);
}

export async function fetchGallery(category = null) {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  const query = params.toString() ? `?${params.toString()}` : "";
  return fetchAPI(`/api/gallery${query}`);
}

export async function fetchGalleryImage(id) {
  return fetchAPI(`/api/gallery/${id}`);
}

export async function fetchActivities() {
  return fetchAPI("/api/activities");
}

export async function fetchActivity(id) {
  return fetchAPI(`/api/activities/${id}`);
}

export async function fetchAchievements() {
  return fetchAPI("/api/achievements");
}

export async function fetchAchievement(id) {
  return fetchAPI(`/api/achievements/${id}`);
}

export async function fetchFacilities() {
  return fetchAPI("/api/facilities");
}

export async function fetchFacility(id) {
  return fetchAPI(`/api/facilities/${id}`);
}

export async function fetchPageContent(slug) {
  try {
    return await fetchAPI(`/api/page-content?slug=${encodeURIComponent(slug)}`);
  } catch (error) {
    console.error(`Failed to fetch page content for slug: ${slug}`, error);
    return null;
  }
}

export async function fetchSiteSettings() {
  try {
    return await fetchAPI("/api/site-settings");
  } catch (error) {
    console.error("Failed to fetch site settings", error);
    return null;
  }
}

// Helper to handle errors gracefully in components
export function handleFetchError(error, defaultValue = []) {
  console.error("Data fetch error:", error.message);
  return defaultValue;
}

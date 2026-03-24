const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

const TOKEN_KEY = "rozgar_access_token";
const USER_KEY = "rozgar_user";
const PROFILE_KEY = "rozgar_profile";

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
}

export function getStoredProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"); } catch { return null; }
}

export function setSessionFromAuthResponse(data) {
  if (data?.access_token) localStorage.setItem(TOKEN_KEY, data.access_token);
  if (data?.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function saveMePayload(data) {
  if (data?.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  if (data?.profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();
  const isFormData = options.body instanceof FormData;

  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (!isFormData && options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload?.detail || payload?.message || "Request failed";
    throw new Error(message);
  }

  return payload;
}

export async function refreshMe() {
  const data = await apiFetch("/me");
  saveMePayload(data);
  return data;
}

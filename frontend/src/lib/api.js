import { supabase } from "./supabase";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export async function getToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) throw new Error("No active session found");
  return token;
}

export async function apiFetch(path, options = {}) {
  const token = await getToken();
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  let data = null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const detail = data?.detail || data?.message || response.statusText;
    throw new Error(detail);
  }
  return data;
}

export { API_BASE };

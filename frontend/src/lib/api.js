import { supabase } from "./supabase";

// Change this to your backend URL
export const API_BASE = "http://127.0.0.1:8000";

export async function apiFetch(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.detail || "Request failed");
  }

  return data;
}
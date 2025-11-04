// src/lib/api.ts

// Base URL da API (defina em .env do Vite: VITE_API_URL=http://localhost:4000)
const ENV_BASE = import.meta.env?.VITE_API_URL as string | undefined;
export const API_URL = (ENV_BASE ?? "http://localhost:4000").replace(/\/+$/, ""); // sem barra final

export function getToken() {
  return localStorage.getItem("token");
}

export function setToken(t: string | null) {
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

type ApiInit = RequestInit & { json?: unknown };

export async function api(path: string, init: ApiInit = {}) {
  // aceita path absoluto ou relativo à API
  const url = /^https?:\/\//i.test(path) ? path : API_URL + path;

  const headers = new Headers(init.headers);

  // só seta Content-Type se estiver enviando body JSON
  const hasBody = init.body != null || init.json != null;
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // token, se houver
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", "Bearer " + token);
  }

  // permite passar `json` que já serializa
  const body =
    init.json !== undefined
      ? JSON.stringify(init.json)
      : (init.body as BodyInit | null | undefined);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers, body });
  } catch (e: any) {
    // erro de rede/CORS/time-out
    throw new Error(`NETWORK_ERROR: ${e?.message ?? "Failed to fetch"}`);
  }

  // 204/205 etc.
  if (res.status === 204 || res.status === 205) return null as unknown as any;

  // tenta ler como texto e depois JSON (para mensagens do backend)
  const raw = await res.text().catch(() => "");
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data && (data as any).error) ||
      (typeof data === "string" && data) ||
      res.statusText ||
      "Request failed";
    throw new Error(`${res.status} ${msg}`);
  }

  return data as any;
}

// Helpers convenientes
export const get  = (p: string, init?: ApiInit) => api(p, { ...init, method: "GET" });
export const post = (p: string, json?: unknown, init?: ApiInit) => api(p, { ...init, method: "POST", json });
export const put  = (p: string, json?: unknown, init?: ApiInit) => api(p, { ...init, method: "PUT", json });
export const del  = (p: string, init?: ApiInit) => api(p, { ...init, method: "DELETE" });

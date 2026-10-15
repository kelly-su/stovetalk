const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export function getPasscode(): string {
  try {
    return sessionStorage.getItem("passcode") ?? "";
  } catch {
    return "";
  }
}

export function setPasscode(code: string) {
  try {
    sessionStorage.setItem("passcode", code);
  } catch {
    // storage unavailable; the passcode just won't be remembered
  }
}

export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("X-Passcode", getPasscode());
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? "Something went wrong.");
  return data;
}
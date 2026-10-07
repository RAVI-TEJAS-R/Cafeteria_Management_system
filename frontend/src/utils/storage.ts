import type { Session } from "../types/auth";

import { STORAGE_KEYS } from "../constants/config";

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function getStoredSession(): Session | null {
  const token = getToken();
  const rawUser = localStorage.getItem(STORAGE_KEYS.user);

  if (!token || !rawUser) {
    return null;
  }

  try {
    const user = JSON.parse(rawUser);

    return {
      token,
      userId: user.userId,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(STORAGE_KEYS.token, session.token);
  localStorage.setItem(
    STORAGE_KEYS.user,
    JSON.stringify({
      userId: session.userId,
      fullName: session.fullName,
      email: session.email,
      role: session.role,
    }),
  );
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.user);
}

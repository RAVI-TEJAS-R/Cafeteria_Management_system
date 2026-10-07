import { useState } from "react";
import type { LoginCredentials, Session } from "../types/auth";
import { login as loginRequest } from "../services/authApi";
import {
  clearSession,
  getStoredSession,
  saveSession,
} from "../utils/storage";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(
    getStoredSession,
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(credentials: LoginCredentials) {
    setMessage("");
    setLoading(true);

    try {
      const nextSession = await loginRequest(credentials);

      saveSession(nextSession);
      setSession(nextSession);
      setMessage("Login successful.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect to API.",
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearSession();
    setSession(null);
  }

  return {
    session,
    message,
    loading,
    setMessage,
    login,
    logout,
  };
}

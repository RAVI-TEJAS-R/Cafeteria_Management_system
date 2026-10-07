const renderApiHost = import.meta.env.VITE_API_HOST as string | undefined;

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (renderApiHost ? `https://${renderApiHost}/api` : "http://localhost:3000/api");

export const STORAGE_KEYS = {
  token: "cafeteria_token",
  user: "cafeteria_user",
} as const;

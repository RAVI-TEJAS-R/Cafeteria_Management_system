import { apiRequest } from "./api";
import type { LoginCredentials, Session } from "../types/auth";

interface LoginApiResponse {
  message: string;
  token: string;
  userId: number;
  fullName: string;
  email: string;
  role: string;
}

export interface RegisterCredentials {
  fullName: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  message: string;
  userId: number;
  fullName: string;
  email: string;
  role: string;
}

export async function login(
  credentials: LoginCredentials,
): Promise<Session> {
  const data = await apiRequest<LoginApiResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  return {
    token: data.token,
    userId: data.userId,
    fullName: data.fullName,
    email: data.email,
    role: data.role,
  };
}

export async function register(
  credentials: RegisterCredentials,
): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}
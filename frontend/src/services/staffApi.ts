import { apiRequest } from "./api";
import type { CreateStaffRequest, ManagedUser, ManagedUserRole, ManagedUserStatus } from "../types/staff";

interface UsersResponse {
  users: ManagedUser[];
}

interface MessageResponse {
  message: string;
}

export async function fetchUsers(
  token: string,
  filters: { search?: string; role?: ManagedUserRole | "ALL"; status?: ManagedUserStatus | "ALL" } = {},
): Promise<ManagedUser[]> {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.role && filters.role !== "ALL") params.set("role", filters.role);
  if (filters.status && filters.status !== "ALL") params.set("status", filters.status);

  const query = params.toString();
  const data = await apiRequest<UsersResponse>(`/users${query ? `?${query}` : ""}`, {}, token);
  return data.users ?? [];
}

export async function createStaff(
  token: string,
  request: CreateStaffRequest,
): Promise<ManagedUser> {
  return apiRequest<ManagedUser>("/users/staff", {
    method: "POST",
    body: JSON.stringify(request),
  }, token);
}

export async function updateUserStatus(
  token: string,
  userId: number,
  status: "Y" | "N",
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(`/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }, token);
}

export async function updateUserRole(
  token: string,
  userId: number,
  role: "STUDENT" | "STAFF",
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(`/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  }, token);
}

export async function resetUserPassword(
  token: string,
  userId: number,
  password: string,
): Promise<MessageResponse> {
  return apiRequest<MessageResponse>(`/users/${userId}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  }, token);
}

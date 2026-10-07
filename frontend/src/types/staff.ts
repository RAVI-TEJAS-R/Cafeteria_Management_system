export type ManagedUserRole = "STUDENT" | "STAFF" | "ADMIN";
export type ManagedUserStatus = "ACTIVE" | "INACTIVE";

export interface ManagedUser {
  userId: number;
  fullName: string;
  email: string;
  role: ManagedUserRole;
  status: ManagedUserStatus;
  createdAt: string;
}

export interface CreateStaffRequest {
  fullName: string;
  email: string;
  password: string;
}

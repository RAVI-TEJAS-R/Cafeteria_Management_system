export interface Session {
  token: string;
  userId: number;
  fullName: string;
  email: string;
  role: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

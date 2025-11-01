// login-request.ts
export interface LoginRequest {
  username: string;
  password: string;
}

// auth-response.ts
export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string
  };
}

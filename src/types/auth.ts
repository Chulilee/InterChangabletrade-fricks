export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: number;
  /** Data URL of the user's avatar (base64-encoded). */
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

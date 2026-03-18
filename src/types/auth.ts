export interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  username: string | null;
  fullName: string | null;
  email: string | null;
}
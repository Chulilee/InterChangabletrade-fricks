"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  AuthState,
  SignInCredentials,
  SignUpCredentials,
} from "@/types/auth";
import {
  getStoredUser,
  signIn as apiSignIn,
  signUp as apiSignUp,
  signOut as apiSignOut,
} from "@/services/authService";

interface AuthContextValue extends AuthState {
  signIn: (credentials: SignInCredentials) => Promise<string | null>;
  signUp: (credentials: SignUpCredentials) => Promise<string | null>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const user = getStoredUser();
    setState({
      user,
      isAuthenticated: user !== null,
      isLoading: false,
      error: null,
    });
  }, []);

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const result = await apiSignIn(credentials);
    if (result.error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: result.error,
      }));
      return result.error;
    }
    setState({
      user: result.user ?? null,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    return null;
  }, []);

  const signUp = useCallback(async (credentials: SignUpCredentials) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const result = await apiSignUp(credentials);
    if (result.error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: result.error,
      }));
      return result.error;
    }
    setState({
      user: result.user ?? null,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await apiSignOut();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signUp, signOut, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

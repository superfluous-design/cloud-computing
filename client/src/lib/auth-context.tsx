import React, { useEffect, useState } from "react";
import type { User } from "./auth";
import {
  login as loginApi,
  register as registerApi,
  getStoredTokens,
  setStoredTokens,
  clearStoredTokens,
} from "./auth";
import { AuthContext } from "./auth-context-definition";
import type { AuthContextType } from "./auth-context-definition";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored tokens on app start
    const tokens = getStoredTokens();
    if (tokens?.access_token) {
      // TODO: Validate token with backend or decode JWT to get user info
      // For now, we'll just set a basic user object
      // In a real app, you'd want to validate the token with the backend
      setUser({
        id: 0, // This should come from token validation
        email: "", // This should come from token validation
        created_at: new Date().toISOString(),
      });
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await loginApi({ email, password });
    setStoredTokens(response.tokens);
    setUser(response.user);
  };

  const register = async (email: string, password: string) => {
    await registerApi({ email, password });
    // After successful registration, automatically log in
    await login(email, password);
  };

  const logout = () => {
    clearStoredTokens();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

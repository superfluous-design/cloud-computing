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
import { getUserFromToken, isTokenExpired } from "./jwt-utils";

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
      // Check if token is expired
      if (isTokenExpired(tokens.access_token)) {
        console.log("Access token expired, clearing tokens");
        clearStoredTokens();
        setUser(null);
      } else {
        // Decode JWT to get user info
        const userFromToken = getUserFromToken(tokens.access_token);
        if (userFromToken) {
          setUser(userFromToken);
        } else {
          console.log("Failed to decode token, clearing tokens");
          clearStoredTokens();
          setUser(null);
        }
      }
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

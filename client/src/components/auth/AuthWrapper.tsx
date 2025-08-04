import React, { useState } from "react";
import { useAuth } from "../../lib/use-auth";
import { LoginPage } from "./LoginPage";
import { RegisterPage } from "./RegisterPage";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return isLoginMode ? (
      <LoginPage onSwitchToRegister={() => setIsLoginMode(false)} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setIsLoginMode(true)} />
    );
  }

  return <>{children}</>;
};

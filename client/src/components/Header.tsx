import React from "react";
import { useAuth } from "../lib/use-auth";
import { Button } from "./ui/button";

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">Superfluous</h1>
          </div>

          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.email}
              </span>
              <Button variant="outline" onClick={logout} className="text-sm">
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

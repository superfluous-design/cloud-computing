import React, { useState } from "react";
import { useAuth } from "../../lib/use-auth";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-zinc-100">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Or{" "}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors"
            >
              create a new account
            </button>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-zinc-300">
                Email address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="mt-1 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 transition-colors"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-zinc-300">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="mt-1 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 transition-colors"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-950/20 border border-red-800 rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700 transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

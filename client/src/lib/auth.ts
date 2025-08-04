export interface User {
  id: number;
  email: string;
  created_at: string;
}

export interface Tokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  tokens: Tokens;
}

export interface RegisterResponse {
  message: string;
  user_id: number;
}

const API_BASE_URL = "http://localhost/auth/api/v1";

// Token management
export const getStoredTokens = (): Tokens | null => {
  const tokens = localStorage.getItem("auth_tokens");
  return tokens ? JSON.parse(tokens) : null;
};

export const setStoredTokens = (tokens: Tokens): void => {
  localStorage.setItem("auth_tokens", JSON.stringify(tokens));
};

export const clearStoredTokens = (): void => {
  localStorage.removeItem("auth_tokens");
};

export const getAccessToken = (): string | null => {
  const tokens = getStoredTokens();
  return tokens?.access_token || null;
};

// API functions
export const login = async (data: LoginData): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Login failed");
  }

  return response.json();
};

export const register = async (
  data: RegisterData
): Promise<RegisterResponse> => {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Registration failed");
  }

  return response.json();
};

export const refreshToken = async (refreshToken: string): Promise<Tokens> => {
  const response = await fetch(`${API_BASE_URL}/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Token refresh failed");
  }

  const data = await response.json();
  return data.tokens;
};

// Authenticated request helper
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const tokens = getStoredTokens();

  if (!tokens?.access_token) {
    throw new Error("No access token available");
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${tokens.access_token}`,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If token is expired, try to refresh
  if (response.status === 401) {
    try {
      const newTokens = await refreshToken(tokens.refresh_token);
      setStoredTokens(newTokens);

      // Retry the request with new token
      const retryHeaders = {
        ...options.headers,
        Authorization: `Bearer ${newTokens.access_token}`,
      };

      return fetch(url, {
        ...options,
        headers: retryHeaders,
      });
    } catch (error) {
      // Refresh failed, clear tokens and throw error
      clearStoredTokens();
      console.error(error);
      throw new Error("Authentication failed");
    }
  }

  return response;
};

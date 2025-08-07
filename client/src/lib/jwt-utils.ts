// JWT utility functions for decoding tokens (without validation - for client-side use only)

interface JWTPayload {
  user_id: number;
  email: string;
  exp: number;
  iat: number;
  nbf: number;
}

export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (middle part)
    const payload = parts[1];

    // Add padding if needed for base64 decoding
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);

    // Decode base64
    const decoded = atob(padded);

    // Parse JSON
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload) {
    return true;
  }

  // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
  return payload.exp * 1000 < Date.now();
};

export const getUserFromToken = (token: string) => {
  const payload = decodeJWT(token);
  if (!payload) {
    return null;
  }

  return {
    id: payload.user_id,
    email: payload.email,
    created_at: new Date(payload.iat * 1000).toISOString(),
  };
};

import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

interface TokenPayload {
  userId: string;
  email: string;
  username: string;
}

// Creates a JWT token for a user after they register or login
// The expiry date for the token is set to 7 days
export function createToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });
}

// Verifies that a token is valid and returns the data inside it
// Returns null if the token is invalid or expired
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET as string) as TokenPayload;
  } catch {
    return null;
  }
}

// Extracts the JWT token from the Authorization header and verifies it
// Returns the token payload if valid, null if missing or invalid
export function getTokenFromRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  return verifyToken(token);
}
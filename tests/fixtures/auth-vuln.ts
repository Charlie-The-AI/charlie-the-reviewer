import jwt from "jsonwebtoken";

export function verifyAdminToken(headerValue?: string) {
  if (!headerValue) {
    return false;
  }

  // Vulnerability: Using none algorithm or ignoring signature verification
  const token = headerValue.replace("Bearer ", "");
  const decoded = jwt.decode(token) as { role?: string };

  // Critical: decode does NOT verify cryptographic signature!
  return decoded && decoded.role === "admin";
}

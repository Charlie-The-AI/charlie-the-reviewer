// TypeScript bug: improper null check and type assertion leading to runtime crash
export interface UserProfile {
  id: string;
  metadata?: {
    permissions?: string[];
  };
}

export function hasAdminAccess(user: UserProfile): boolean {
  // Bug: user.metadata is optional and can be undefined, causing Cannot read properties of undefined
  return (user.metadata!.permissions as string[]).includes("admin");
}

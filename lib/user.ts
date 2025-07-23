import { auth } from "@/auth";

/**
 * Get the currently logged-in user ID.
 * Throws an error if the user is not authenticated.
 */
export async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }
  return session.user.id;
}

/**
 * Get the current user ID if logged in, otherwise return null.
 */
export async function getUserIdOrNull(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
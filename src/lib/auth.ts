import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthUser = {
  id: string;
  email: string;
};

/**
 * Gets the current authenticated user
 * Deduplicated per request via React.cache() — multiple calls in the same
 * server render only hit Supabase once.
 */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email!,
  };
});

/**
 * Requires authentication - redirects to login if not authenticated
 * Use this in protected pages and server actions
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

/**
 * Gets the current user's ID
 * Throws an error if not authenticated (use in server actions)
 */
export async function getUserId(): Promise<string> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized: User not authenticated");
  }

  return user.id;
}

/**
 * Signs out the current user
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

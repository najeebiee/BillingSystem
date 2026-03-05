import type { User } from "@supabase/supabase-js";

function metadataValue(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function getUserDisplayName(user: User | null): string {
  if (!user) return "";

  const metadata = user.user_metadata ?? {};
  const displayName =
    metadataValue(metadata.display_name) ||
    metadataValue(metadata.full_name) ||
    metadataValue(metadata.name);

  if (displayName) return displayName;

  const email = user.email?.trim();
  if (email) return email;

  return user.id;
}


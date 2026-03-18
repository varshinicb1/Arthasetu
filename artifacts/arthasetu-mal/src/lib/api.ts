import type { UserProfile } from "./types";

const BASE = "/api";

export async function fetchUserProfile(customerId: string): Promise<UserProfile> {
  const res = await fetch(`${BASE}/profiles/${customerId}`);
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return res.json();
}

export async function fetchAllProfiles(): Promise<UserProfile[]> {
  const res = await fetch(`${BASE}/profiles/`);
  if (!res.ok) throw new Error("Failed to fetch profiles");
  return res.json();
}

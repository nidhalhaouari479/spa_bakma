import { getSupabase } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";

/** Personne que l'utilisateur connecté a le droit de contacter (RPC list_contacts). */
export interface Contact {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  animal_id: string | null;
  animal_name: string | null;
}

/**
 * Messagerie : un client ne contacte jamais un autre client.
 * Il peut écrire aux administrateurs (équipe Bakma) et aux vétérinaires attribués à ses animaux.
 */
export async function listContacts(): Promise<Contact[]> {
  const { data, error } = await getSupabase().rpc("list_contacts");
  if (error) throw error;
  return (data ?? []) as Contact[];
}

/** Démarre (ou retrouve) une conversation ; renvoie son id. */
export async function startConversation(otherId: string, animalId: string | null = null): Promise<string> {
  const { data, error } = await getSupabase().rpc("start_conversation", { p_other: otherId, p_animal_id: animalId });
  if (error) throw error;
  return data as string;
}

/** Écrire à l'équipe Bakma (un administrateur actif), éventuellement à propos d'un animal. */
export async function contactBakma(animalId: string | null = null): Promise<string> {
  const admin = (await listContacts()).find((c) => c.role === "admin");
  if (!admin) throw new Error("Le support Bakma est momentanément indisponible.");
  return startConversation(admin.id, animalId);
}

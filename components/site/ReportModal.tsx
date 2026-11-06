"use client";

import { useState } from "react";
import { Alert, Button, Field, Modal, Select, Textarea, useToast } from "@/components/ui";
import { REPORT_REASONS } from "@/lib/catalog";
import { errorMessage, getSupabase } from "@/lib/supabase";

/** Modal « Signaler l'annonce » → insert dans `reports`. */
export function ReportModal({
  open,
  onClose,
  animalId,
  ownerId,
  reporterId,
}: {
  open: boolean;
  onClose: () => void;
  animalId: string;
  ownerId: string;
  reporterId: string;
}) {
  const toast = useToast();
  const [reason, setReason] = useState(REPORT_REASONS[0]!);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const { error: e } = await getSupabase()
        .from("reports")
        .insert({ reporter_id: reporterId, animal_id: animalId, reported_user_id: ownerId, reason, details: details.trim() || null });
      if (e) throw e;
      toast("Merci, votre signalement a été transmis à notre équipe.");
      setDetails("");
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Signaler l'annonce"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="danger" loading={busy} onClick={submit}>
            Envoyer le signalement
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-body">
          Votre signalement est confidentiel. Notre équipe de modération l&apos;examinera dans les plus brefs délais.
        </p>
        <Field label="Motif">
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {REPORT_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Field label="Détails (facultatif)">
          <Textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Décrivez le problème…" maxLength={1000} />
        </Field>
        <Alert>{error}</Alert>
      </div>
    </Modal>
  );
}

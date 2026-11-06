"use client";

import { useRef, useState } from "react";
import { Eye, FileImage, FileText, FileType2, Trash2, UploadCloud } from "lucide-react";
import { Alert, cn, Input, useToast } from "@/components/ui";
import { signedDocumentUrl, uploadPrivateDocument } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";
import type { AnimalDocument } from "@/lib/types";

export const MAX_DOCUMENTS = 6;
const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo
const EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx"];
const ACCEPT = EXTENSIONS.map((e) => `.${e}`).join(",");

/** Document de l'étape « Documents » : déjà en base (`id`) ou en attente d'envoi (`file`). */
export interface DocDraft {
  key: string;
  id?: string;
  title: string;
  file_name: string;
  file_path?: string;
  file?: File;
}

export function toDrafts(docs: AnimalDocument[]): DocDraft[] {
  return docs.map((d) => ({ key: d.id, id: d.id, title: d.title, file_name: d.file_name ?? d.title, file_path: d.file_path }));
}

const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const baseName = (name: string) => name.replace(/\.[^.]+$/, "");

/** Ouvre un document privé (URL signée) dans un nouvel onglet. */
export async function openPrivate(path: string) {
  const w = window.open("", "_blank");
  const url = await signedDocumentUrl(path);
  if (!url) {
    w?.close();
    throw new Error("Document inaccessible");
  }
  if (w) w.location.href = url;
  else window.location.assign(url);
}

/**
 * Enregistre les documents après la sauvegarde de l'annonce :
 * supprime ceux retirés, envoie les nouveaux fichiers.
 */
export async function syncDocuments(uid: string, animalId: string, initial: DocDraft[], current: DocDraft[]) {
  const supabase = getSupabase();
  const kept = new Set(current.filter((d) => d.id).map((d) => d.id));
  const removed = initial.filter((d) => d.id && !kept.has(d.id));
  if (removed.length) {
    const { error } = await supabase.from("animal_documents").delete().in("id", removed.map((d) => d.id!));
    if (error) throw error;
    await supabase.storage.from("vet-documents").remove(removed.map((d) => d.file_path!));
  }
  // titres modifiés des documents existants
  for (const d of current) {
    const before = initial.find((x) => x.id && x.id === d.id);
    if (before && before.title !== d.title) {
      const { error } = await supabase.from("animal_documents").update({ title: d.title.trim() || before.title }).eq("id", d.id!);
      if (error) throw error;
    }
  }
  for (const d of current.filter((x) => x.file)) {
    const path = await uploadPrivateDocument(uid, d.file!, "animal-docs");
    const { error } = await supabase
      .from("animal_documents")
      .insert({ animal_id: animalId, owner_id: uid, title: d.title.trim() || baseName(d.file_name), file_path: path, file_name: d.file_name });
    if (error) {
      await supabase.storage.from("vet-documents").remove([path]);
      throw error;
    }
  }
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

function DocIcon({ name }: { name: string }) {
  const ext = extOf(name);
  const [Icon, tone] =
    ext === "pdf" ? [FileText, "bg-red-50 text-red-600"] : ["doc", "docx"].includes(ext) ? [FileType2, "bg-blue-50 text-blue-700"] : [FileImage, "bg-emerald-50 text-emerald-700"];
  return (
    <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tone)}>
      <Icon className="size-5" />
    </span>
  );
}

/** Étape « Documents » du formulaire d'annonce : jusqu'à 6 fichiers, facultatif. */
export function DocumentsStep({ value, onChange }: { value: DocDraft[]; onChange: (docs: DocDraft[]) => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remaining = MAX_DOCUMENTS - value.length;

  function add(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files);
    const problems: string[] = [];
    const accepted: DocDraft[] = [];
    for (const f of list) {
      if (!EXTENSIONS.includes(extOf(f.name))) problems.push(`« ${f.name} » : format non accepté`);
      else if (f.size > MAX_SIZE) problems.push(`« ${f.name} » dépasse 10 Mo`);
      else if (accepted.length >= remaining) problems.push(`« ${f.name} » : ${MAX_DOCUMENTS} documents maximum`);
      else accepted.push({ key: crypto.randomUUID(), title: baseName(f.name), file_name: f.name, file: f });
    }
    if (accepted.length) onChange([...value, ...accepted]);
    if (problems.length) setError(problems.join(" · "));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Documents de l&apos;animal</h2>
          <p className="mt-1 text-sm text-body">
            Facultatif : carnet de santé, certificat de vaccination, pedigree, puce… Visibles uniquement par le vétérinaire et l&apos;équipe Bakma Store.
          </p>
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", remaining === 0 ? "bg-amber-50 text-amber-700" : "bg-primary-soft text-primary")}>
          {value.length}/{MAX_DOCUMENTS}
        </span>
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            add(e.dataTransfer.files);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition",
            drag ? "border-primary bg-primary-soft/60" : "border-line bg-page/50 hover:border-primary/50 hover:bg-primary-soft/30",
          )}
        >
          <span className="grid size-12 place-items-center rounded-full bg-white text-primary shadow-sm">
            <UploadCloud className="size-6" />
          </span>
          <span className="text-sm font-bold text-navy">Glissez vos fichiers ici ou cliquez pour parcourir</span>
          <span className="text-xs text-muted">
            PDF, JPG, PNG, WEBP, DOC, DOCX · 10 Mo max par fichier · encore {remaining} fichier{remaining > 1 ? "s" : ""}
          </span>
        </button>
      )}
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        onChange={(e) => {
          if (e.target.files) add(e.target.files);
          e.target.value = "";
        }}
      />

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((d) => (
            <li key={d.key} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
              <DocIcon name={d.file_name} />
              <div className="min-w-0 flex-1">
                <Input
                  value={d.title}
                  onChange={(e) => onChange(value.map((x) => (x.key === d.key ? { ...x, title: e.target.value } : x)))}
                  placeholder="Titre du document"
                  aria-label="Titre du document"
                  maxLength={120}
                  className="h-10 text-sm font-semibold"
                />
                <p className="mt-1 truncate px-1 text-xs text-muted">
                  {d.file_name}
                  {d.file ? ` · ${formatSize(d.file.size)} · sera envoyé à l'enregistrement` : ""}
                </p>
              </div>
              {d.file_path && (
                <button
                  type="button"
                  onClick={() => openPrivate(d.file_path!).catch(() => toast("Impossible d'ouvrir ce document", "error"))}
                  className="grid size-9 shrink-0 place-items-center rounded-lg text-navy hover:bg-primary-soft hover:text-primary"
                  aria-label="Voir le document"
                >
                  <Eye className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x.key !== d.key))}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-red-500 hover:bg-red-50"
                aria-label="Retirer le document"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Alert>{error}</Alert>
    </div>
  );
}

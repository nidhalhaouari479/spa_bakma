/** Concatène des classes CSS (utilisable côté serveur comme côté client). */
export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

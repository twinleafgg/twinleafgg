/** Loads ptcg-server/implementedCardIds.json (served by Vite at /implemented-card-ids.json). */

let cached: Set<string> | null = null;

export async function loadImplementedCardIds(): Promise<Set<string>> {
  if (cached) return cached;
  try {
    const res = await fetch('/implemented-card-ids.json');
    if (!res.ok) {
      console.warn('implementedCardIds.json not found — browse will not grey out implemented cards.');
      cached = new Set();
      return cached;
    }
    const data = (await res.json()) as { implementedCardIds?: string[] };
    cached = new Set(data.implementedCardIds || []);
  } catch (e) {
    console.warn('Failed to load implemented card ids', e);
    cached = new Set();
  }
  return cached;
}

export function clearImplementedCache(): void {
  cached = null;
}

/** Session-only: grey out a card immediately after a successful save. */
export function markImplemented(cardId: string): void {
  if (!cached) cached = new Set();
  cached.add(cardId);
}

export function isImplemented(ids: Set<string>, cardId: string): boolean {
  return ids.has(cardId);
}

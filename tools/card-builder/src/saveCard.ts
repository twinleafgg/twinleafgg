import {
  classNameForVariant,
  fullNameForVariant,
  toPascalClassName,
} from './cardIdentity';
import { generateCardSource } from './generator/generateCard';
import { getCard, findReprintCandidates } from './tcgdex/client';
import { mapTcgDexCardToDraft } from './tcgdex/mapCardToDraft';
import type { CardDraft, ReprintCandidate } from './types';

export interface SaveCardReprintPayload {
  className: string;
  sourceClassName: string;
  sourcePath: string;
  name: string;
  set: string;
  setNumber: string;
  fullName: string;
  regulationMark?: string;
}

export interface SaveCardRequest {
  draft: CardDraft;
  /** Existing generated source. Regenerated if missing or out of date. */
  source?: string;
  className?: string;
  occurrence?: number;
  reprint?: SaveCardReprintPayload;
  overwrite?: boolean;
  /** Called on 409 when overwrite is false. Return true to retry with overwrite. */
  onConflict?: () => boolean | Promise<boolean>;
}

export type SaveCardOutcome = 'saved' | 'reprint' | 'skipped' | 'cancelled' | 'failed';

export interface SaveCardResult {
  outcome: SaveCardOutcome;
  message: string;
  path?: string;
  className?: string;
  source?: string;
  cardId?: string;
  name?: string;
}

interface SaveCardApiResponse {
  message?: string;
  error?: string;
  path?: string;
  className?: string;
}

function sanitizeClassName(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, '') || 'NewCard';
}

function draftClassName(draft: CardDraft, occurrence: number): string {
  if (draft.className.trim()) return sanitizeClassName(draft.className.trim());
  return classNameForVariant(toPascalClassName(draft.name) || 'NewCard', occurrence);
}

function draftFullName(draft: CardDraft, occurrence: number): string {
  return fullNameForVariant(draft.name, draft.set, occurrence);
}

function sourceMatchesIdentity(source: string, className: string, fullName: string): boolean {
  const classMatches = new RegExp(`export class\\s+${className}\\b`).test(source);
  const fullNameMatches =
    source.includes(`fullName: string = '${fullName}'`) || source.includes(`fullName = '${fullName}'`);
  return classMatches && fullNameMatches;
}

async function postSaveCard(payload: {
  set: string;
  className: string;
  source?: string;
  overwrite?: boolean;
  reprint?: SaveCardReprintPayload;
}): Promise<{ ok: boolean; status: number; body: SaveCardApiResponse }> {
  const response = await fetch('/save-card', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as SaveCardApiResponse;
  return { ok: response.ok, status: response.status, body };
}

export async function saveCardToServer(request: SaveCardRequest): Promise<SaveCardResult> {
  const occurrence = request.occurrence ?? 1;
  const reprint = request.reprint;
  const className = sanitizeClassName(
    request.className || (reprint ? reprint.className : draftClassName(request.draft, occurrence))
  );
  let source = request.source || '';

  try {
    if (!reprint) {
      const fullName = draftFullName(request.draft, occurrence);
      if (!source || !sourceMatchesIdentity(source, className, fullName)) {
        source = await generateCardSource(request.draft, { occurrence });
      }
    }
  } catch (error) {
    return {
      outcome: 'failed',
      message: error instanceof Error ? error.message : String(error),
      className,
      name: request.draft.name,
    };
  }

  if (!source && !reprint) {
    return { outcome: 'failed', message: 'Generated source is empty.', name: request.draft.name };
  }

  const send = (overwrite: boolean) =>
    postSaveCard({
      set: request.draft.set,
      className,
      source,
      overwrite,
      ...(reprint ? { reprint: { ...reprint, className } } : {}),
    });

  let overwrite = Boolean(request.overwrite);
  let response = await send(overwrite);

  if (response.status === 409 && !overwrite) {
    if (request.onConflict && (await request.onConflict())) {
      response = await send(true);
    } else if (request.onConflict) {
      return {
        outcome: 'cancelled',
        message: response.body.error || 'File already exists.',
        path: response.body.path,
        className,
        source,
        name: request.draft.name,
      };
    } else {
      return {
        outcome: 'skipped',
        message: response.body.error || 'File already exists.',
        path: response.body.path,
        className,
        source,
        name: request.draft.name,
      };
    }
  }

  if (!response.ok) {
    return {
      outcome: 'failed',
      message: response.body.error || `Save failed (${response.status})`,
      className,
      source,
      name: request.draft.name,
    };
  }

  return {
    outcome: reprint ? 'reprint' : 'saved',
    message: response.body.message || 'Saved to ptcg-server.',
    path: response.body.path,
    className: response.body.className || className,
    source,
    name: request.draft.name,
  };
}

export function identicalReprint(candidates: ReprintCandidate[]): ReprintCandidate | undefined {
  return candidates.find(candidate => candidate.identical);
}

export async function generateAndSaveCatalogCard(
  cardId: string,
  options: { overwrite: boolean }
): Promise<SaveCardResult> {
  const card = await getCard(cardId);
  const draft = mapTcgDexCardToDraft(card);
  const lookup = await findReprintCandidates(draft);
  const identical = identicalReprint(lookup.candidates);
  const occurrence = identical ? 1 : lookup.nextOccurrence;
  const className = classNameForVariant(toPascalClassName(draft.name) || 'NewCard', occurrence);
  draft.className = className;

  const reprint = identical
    ? {
        className,
        sourceClassName: identical.className,
        sourcePath: identical.sourcePath,
        name: draft.name,
        set: draft.set,
        setNumber: draft.setNumber,
        fullName: fullNameForVariant(draft.name, draft.set, 1),
        regulationMark: draft.regulationMark,
      }
    : undefined;

  const result = await saveCardToServer({
    draft,
    className,
    occurrence,
    reprint,
    overwrite: options.overwrite,
  });

  return {
    ...result,
    cardId: card.id,
    name: draft.name || card.id,
  };
}

export async function generateAndSaveCatalogCards(
  cardIds: string[],
  options: {
    overwrite: boolean;
    onProgress?: (info: { index: number; total: number; cardId: string }) => void;
  }
): Promise<SaveCardResult[]> {
  const results: SaveCardResult[] = [];
  for (let i = 0; i < cardIds.length; i++) {
    const cardId = cardIds[i];
    options.onProgress?.({ index: i + 1, total: cardIds.length, cardId });
    try {
      results.push(await generateAndSaveCatalogCard(cardId, { overwrite: options.overwrite }));
    } catch (error) {
      results.push({
        outcome: 'failed',
        message: error instanceof Error ? error.message : String(error),
        cardId,
        name: cardId,
      });
    }
  }
  return results;
}

export function summarizeBulkSave(results: SaveCardResult[]): string {
  const saved = results.filter(result => result.outcome === 'saved').length;
  const reprints = results.filter(result => result.outcome === 'reprint').length;
  const skipped = results.filter(result => result.outcome === 'skipped');
  const failed = results.filter(result => result.outcome === 'failed');
  const parts = [
    `${saved} saved`,
    `${reprints} reprint${reprints === 1 ? '' : 's'}`,
    `${skipped.length} skipped`,
    `${failed.length} failed`,
  ];
  let message = `Bulk save finished: ${parts.join(', ')}.`;
  if (failed.length) {
    message += ` Failed: ${failed.map(result => result.name || result.cardId).join(', ')}.`;
  }
  if (skipped.length) {
    message += ` Skipped: ${skipped.map(result => result.name || result.cardId).join(', ')}.`;
  }
  return message;
}

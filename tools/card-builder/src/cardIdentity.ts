import { asciiCardName } from './textAccuracy';

/** "Hop's Phantump" → "HopsPhantump"; "Poké Healer +" → "PokeHealer". */
export function toPascalClassName(name: string): string {
  return asciiCardName(name)
    .replace(/[''\u2019]s\b/gi, 's')
    .replace(/[''\u2019]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

/** Named effect entry used for reprint-vs-variant identity. */
export interface NamedEffect {
  name: string;
  text: string;
}

/**
 * Card identity for reprint detection (aligned with generate-set-stubs
 * `cardsAreIdentical` / docs/AGENTS.md): attack and power name+text, order-sensitive.
 * Trainers/Energy use `effectText` instead.
 */
export interface CardSignature {
  attacks: NamedEffect[];
  powers: NamedEffect[];
  /** Trainer or Energy `text` — empty for Pokemon. */
  effectText: string;
}

export function emptySignature(): CardSignature {
  return { attacks: [], powers: [], effectText: '' };
}

export function normalizeEffectText(text: string): string {
  return text.trim();
}

export function signaturesMatch(a: CardSignature, b: CardSignature): boolean {
  if (normalizeEffectText(a.effectText) !== normalizeEffectText(b.effectText)) {
    return false;
  }
  if (a.attacks.length !== b.attacks.length) return false;
  for (let i = 0; i < a.attacks.length; i++) {
    if (a.attacks[i].name !== b.attacks[i].name) return false;
    if (normalizeEffectText(a.attacks[i].text) !== normalizeEffectText(b.attacks[i].text)) {
      return false;
    }
  }
  if (a.powers.length !== b.powers.length) return false;
  for (let i = 0; i < a.powers.length; i++) {
    if (a.powers[i].name !== b.powers[i].name) return false;
    if (normalizeEffectText(a.powers[i].text) !== normalizeEffectText(b.powers[i].text)) {
      return false;
    }
  }
  return true;
}

/**
 * Next occurrence index for a distinct same-name card.
 * `1` = unsuffixed (Frigibax / frigibax.ts / Frigibax PAL).
 * `2+` = Frigibax2 / frigibax-2.ts / Frigibax PAL2.
 *
 * Counts primary variants already on disk (class names matching base or base+digits).
 */
export function variantOccurrence(baseClassName: string, existingClassNames: string[]): number {
  if (!baseClassName) return 1;
  const escaped = baseClassName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}(\\d*)$`);
  let max = 0;
  for (const className of existingClassNames) {
    const match = pattern.exec(className);
    if (!match) continue;
    const suffix = match[1];
    const n = suffix === '' ? 1 : Number(suffix);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

export function classNameForVariant(baseClassName: string, occurrence: number): string {
  if (!baseClassName) return occurrence > 1 ? `NewCard${occurrence}` : 'NewCard';
  if (occurrence <= 1) return baseClassName;
  return `${baseClassName}${occurrence}`;
}

export function fullNameForVariant(name: string, set: string, occurrence: number): string {
  const trimmedName = name.trim();
  const trimmedSet = set.trim();
  if (!trimmedName) return '';
  if (!trimmedSet) return trimmedName;
  if (occurrence <= 1) return `${trimmedName} ${trimmedSet}`;
  return `${trimmedName} ${trimmedSet}${occurrence}`;
}

/** Strip a trailing digit suffix used for same-set variants (Frigibax2 → Frigibax). */
export function baseClassNameFromVariant(className: string): string {
  return className.replace(/\d+$/, '') || className;
}

export function signatureFromDraftParts(parts: {
  extends: 'PokemonCard' | 'TrainerCard' | 'EnergyCard';
  hasAttacks?: boolean;
  hasPowers?: boolean;
  attacks?: Array<{ name: string; text: string }>;
  powers?: Array<{ name: string; text: string }>;
  trainerText?: string;
  energyText?: string;
}): CardSignature {
  if (parts.extends === 'TrainerCard') {
    return {
      attacks: [],
      powers: [],
      effectText: parts.trainerText ?? '',
    };
  }
  if (parts.extends === 'EnergyCard') {
    return {
      attacks: [],
      powers: [],
      effectText: parts.energyText ?? '',
    };
  }
  return {
    attacks: parts.hasAttacks
      ? (parts.attacks ?? []).map(a => ({ name: a.name.trim(), text: a.text }))
      : [],
    powers: parts.hasPowers
      ? (parts.powers ?? []).map(p => ({ name: p.name.trim(), text: p.text }))
      : [],
    effectText: '',
  };
}

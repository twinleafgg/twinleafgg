/**
 * Shared text helpers so generated cards keep the numbers, energy types, and
 * Poké/Pokémon spelling from the source card instead of a similar card's values.
 */

/** Map Poké/Pokémon (and accented letters) to ASCII used in class/file names. */
export function asciiCardName(name: string): string {
  return name
    .replace(/Pokémon/gi, 'Pokemon')
    .replace(/Poké/gi, 'Poke')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeMatchText(text: string): string {
  return asciiCardName(text)
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractNumbers(text: string): string[] {
  return [...normalizeMatchText(text).matchAll(/\d+/g)].map(match => match[0]);
}

const ENERGY_TYPE_BY_CODE: Record<string, string> = {
  G: 'grass',
  R: 'fire',
  W: 'water',
  L: 'lightning',
  P: 'psychic',
  F: 'fighting',
  D: 'darkness',
  M: 'metal',
  Y: 'fairy',
  N: 'dragon',
  C: 'colorless',
};

function extractEnergyTypes(text: string): Set<string> {
  const normalized = normalizeMatchText(text);
  const types = new Set<string>();

  for (const match of normalized.matchAll(/\[([A-Z])\](?=\s*(?:(?:basic|special)\s+)?energy\b)/gi)) {
    const type = ENERGY_TYPE_BY_CODE[match[1].toUpperCase()];
    if (type) types.add(type);
  }

  const wordTypes: Record<string, string> = {
    grass: 'grass',
    fire: 'fire',
    water: 'water',
    lightning: 'lightning',
    electric: 'lightning',
    psychic: 'psychic',
    fighting: 'fighting',
    darkness: 'darkness',
    dark: 'darkness',
    metal: 'metal',
    fairy: 'fairy',
    dragon: 'dragon',
    colorless: 'colorless',
  };
  for (const match of normalized.matchAll(
    /\b(grass|fire|water|lightning|electric|psychic|fighting|darkness|dark|metal|fairy|dragon|colorless)\s+(?:(?:basic|special)\s+)?energy\b/gi
  )) {
    types.add(wordTypes[match[1].toLowerCase()]);
  }

  return types;
}

/**
 * Similar effect text is not interchangeable when it specifies a different
 * Energy type (for example, [P] and [W] attacks have different rules).
 * Treat a typed effect and an untyped effect as incompatible too, since either
 * direction could silently narrow or broaden what the generated code counts.
 */
export function energyTypesCompatible(left: string, right: string): boolean {
  const leftTypes = extractEnergyTypes(left);
  const rightTypes = extractEnergyTypes(right);
  return leftTypes.size === rightTypes.size && [...leftTypes].every(type => rightTypes.has(type));
}

/**
 * The bonus in "does 10 damage plus 20 more damage" is 20, not 10+20.
 * For "does 10 more damage" it is 10.
 */
export function bonusDamageFromText(text: string): string | undefined {
  const normalized = normalizeMatchText(text);
  const plusMore = normalized.match(
    /does\s+\d+\s+damage\s+plus\s+(\d+)\s+more\s+damage/i
  );
  if (plusMore) return plusMore[1];
  const more = normalized.match(/does\s+(\d+)\s+more\s+damage/i);
  if (more) return more[1];
  return undefined;
}

/** "remove 1 damage counter" heals 10; "remove 3 damage counters" heals 30. */
export function healFromDamageCounters(countRaw: string | undefined, fallback = 10): number {
  if (!countRaw || /^(a|an|one)$/i.test(countRaw)) return 10;
  const count = Number(countRaw);
  if (!Number.isFinite(count) || count <= 0) return fallback;
  return count * 10;
}

/**
 * Keep "Flip a coin. If heads, …" as one clause so the coin-gated prefab
 * matches instead of an unconditional "+X damage" prefab.
 */
export function joinRelatedClauses(clauses: string[]): string[] {
  const joined: string[] = [];
  for (let i = 0; i < clauses.length; i++) {
    const current = clauses[i];
    const next = clauses[i + 1];
    if (
      next &&
      /^flip (?:a coin|\d+ coins?)\.?$/i.test(current) &&
      /^if (heads|tails)\b/i.test(next)
    ) {
      joined.push(`${current.replace(/\.$/, '')}. ${next}`);
      i += 1;
      continue;
    }
    joined.push(current);
  }
  return joined;
}

/**
 * Rewrite numeric literals in generated/copied code to the values from the
 * card being generated. Skips attack/power indexes in WAS_*_USED guards.
 */
export function substituteNumbersInCode(
  source: string,
  fromText: string,
  toText: string
): string {
  const from = extractNumbers(fromText);
  const to = extractNumbers(toText);
  if (from.length === 0 || from.length !== to.length) return source;
  if (from.every((value, i) => value === to[i])) return source;

  const replacements = from.map((value, i) => ({ from: value, to: to[i] }));
  return source.replace(/\bWAS_(ATTACK|POWER)_USED\([^)]*\)|\b\d+\b/g, token => {
    if (token.startsWith('WAS_')) return token;
    const hit = replacements.find(entry => entry.from === token);
    return hit ? hit.to : token;
  });
}

export function substituteNumbersInLines(
  lines: string[],
  fromText: string,
  toText: string
): string[] {
  return lines.map(line => substituteNumbersInCode(line, fromText, toText));
}

/**
 * Query/effect number lists are compatible when they match, or when they have
 * the same count and can be substituted into copied code.
 */
export function numbersCompatible(query: string, effectText: string): boolean {
  const q = extractNumbers(query);
  const e = extractNumbers(effectText);
  if (q.length === 0 && e.length === 0) return true;
  if (q.length !== e.length) return false;
  return true;
}

/** Replace numeric literals in a prefab call with captured match values. */
export function substituteCallCaptures(
  callLine: string,
  exampleText: string,
  capturedNumbers: string[]
): string {
  const exampleNumbers = extractNumbers(exampleText);
  if (exampleNumbers.length === 0 || capturedNumbers.length === 0) return callLine;
  const count = Math.min(exampleNumbers.length, capturedNumbers.length);
  const replacements = exampleNumbers.slice(0, count).map((value, i) => ({
    from: value,
    to: capturedNumbers[i],
  }));
  return callLine.replace(/\b\d+\b/g, token => {
    const hit = replacements.find(entry => entry.from === token);
    return hit ? hit.to : token;
  });
}

export function isFossilTrainer(name: string, text: string): boolean {
  const blob = `${name} ${text}`;
  return /play .{0,40}as if it were a colorless basic/i.test(blob) ||
    /\b(old amber|root fossil|armor fossil|skull fossil|dome fossil|helix fossil|mysterious fossil|claw fossil|sail fossil|plume fossil|cover fossil|jaw fossil)\b/i.test(name);
}

export function fossilEvolvesTo(name: string): string {
  const key = name.toLowerCase();
  if (key.includes('armor')) return 'Shieldon';
  if (key.includes('skull')) return 'Cranidos';
  if (key.includes('dome')) return 'Kabuto';
  if (key.includes('helix')) return 'Omanyte';
  if (key.includes('root')) return 'Lileep';
  if (key.includes('old amber') || key.includes('amber')) return 'Aerodactyl';
  if (key.includes('claw')) return 'Anorith';
  if (key.includes('mysterious')) return 'Aerodactyl';
  return '';
}

export function fossilHp(name: string): number {
  return /root fossil/i.test(name) ? 40 : 50;
}

export function isTechnicalMachine(name: string, text: string): boolean {
  return /^technical machine/i.test(name) ||
    /that pokemon may use this card'?s attack instead of its own/i.test(text);
}

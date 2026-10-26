import { ANY_PRINTING_ALLOWED } from '../game/store/card/any-printing-allowed';
import { Card } from '../game/store/card/card';
import { EnergyType, SuperType } from '../game/store/card/card-types';
import { Format as FormatId } from '../game/store/card/card-types';
import { getPrintingReleaseDate } from '../game/format/printing-release-date';
import { FORMAT_BANLISTS, FORMAT_SET_RELEASE_DATES } from './format-data';

const standardStartDate = FORMAT_SET_RELEASE_DATES.TEF;
const expandedStartDate = new Date('2011-04-25');

function isBasicEnergy(card: Card): boolean {
  return card.superType === SuperType.ENERGY && card.energyType === EnergyType.BASIC;
}

type BanlistEntry = { name: string; set: string; setNumber: string };

export function isBannedPrinting(card: Card, banlist: BanlistEntry[]): boolean {
  return banlist.some((banned) =>
    card.name === banned.name &&
    (banned.set === '*' || card.set === banned.set) &&
    (banned.setNumber === '*' || card.setNumber === banned.setNumber),
  );
}

export function getFormatBanlistEntries(formatId: FormatId): BanlistEntry[] {
  return (FORMAT_BANLISTS[formatId] || []).map((entry) => {
    const parts = entry.split(' ');
    const setNumber = parts.pop() || '*';
    const set = parts.pop() || '*';
    return { name: parts.join(' '), set, setNumber };
  });
}

function hasLegalReprint(card: Card, allCards: Card[] | undefined, isLegal: (printing: Card) => boolean): boolean {
  if (!ANY_PRINTING_ALLOWED.includes(card.name) || !allCards) {
    return isLegal(card);
  }
  const printings = allCards.filter((printing) => printing.name === card.name);
  return (printings.length > 0 ? printings : [card]).some(isLegal);
}

function isStandardPrintingLegal(card: Card, nightly: boolean): boolean {
  const setDate = getPrintingReleaseDate(card, FORMAT_SET_RELEASE_DATES);
  const mark = card.regulationMark;
  return !!setDate &&
    setDate >= standardStartDate &&
    (nightly || setDate <= new Date()) &&
    (!mark || mark >= 'H');
}

export function isStandardCardLegal(
  card: Card,
  allCards: Card[] | undefined,
  banlist: BanlistEntry[],
  nightly = false,
): boolean {
  if (!nightly && !ANY_PRINTING_ALLOWED.includes(card.name) && isBannedPrinting(card, banlist)) {
    return false;
  }
  if (isBasicEnergy(card)) {
    return true;
  }
  return hasLegalReprint(
    card,
    allCards,
    (printing) =>
      (nightly || !isBannedPrinting(printing, banlist)) && isStandardPrintingLegal(printing, nightly),
  );
}

export function isExpandedCardLegal(card: Card, banlist: BanlistEntry[]): boolean {
  if (isBasicEnergy(card)) {
    return true;
  }
  if (ANY_PRINTING_ALLOWED.includes(card.name)) {
    return !isBannedPrinting(card, banlist);
  }
  const setDate = FORMAT_SET_RELEASE_DATES[card.set];
  return !!setDate && setDate >= expandedStartDate && setDate <= new Date() &&
    !isBannedPrinting(card, banlist);
}



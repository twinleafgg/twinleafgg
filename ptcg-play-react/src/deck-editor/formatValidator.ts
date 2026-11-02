import {
  Card,
  CardTag,
  EnergyCard,
  EnergyType,
  Format,
  getPrimaryCardType,
  PokemonCard,
  SuperType,
  ANY_PRINTING_ALLOWED,
} from 'ptcg-server';
import type { DeckListEntry } from '../types/responses';
import { getPrintingReleaseDate } from './printingReleaseDate';

export class FormatValidator {
  // --- getValidFormatsForCardList ---
  static getValidFormatsForCardList(cards: Card[], allCards?: Card[]): Format[] {
    if (!cards || cards.length === 0) {
      return [];
    }

    const formats: Format[][] = [];

    // Full catalog when provided enables ANY_PRINTING_ALLOWED (Standard/Nightly: legal if any same-name printing qualifies). Other cards stay per-deck-printing for those formats.
    const cardsToCheck = allCards || cards;

    cards
      .filter(
        (c) =>
          !!c &&
          (c.superType !== SuperType.ENERGY || (c as EnergyCard).energyType === EnergyType.SPECIAL),
      )
      .forEach((card) => {
        formats.push(this.getValidFormats(card, cardsToCheck));
      });

    if (formats.length === 0) {
      return [];
    }

    let formatList = formats.reduce((a, b) => a.filter((c: Format) => b.includes(c)));

    // Add Professor validation check here
    if (!cards) {
      return [];
    }

    const set = new Set(cards.filter((c) => !!c).map((c) => c.name));
    if (
      (set.has('Professor Sycamore') && set.has('Professor Juniper')) ||
      (set.has('Professor Juniper') && set.has("Professor's Research")) ||
      (set.has('Professor Sycamore') && set.has("Professor's Research")) ||
      (set.has('Lysandre') && set.has("Boss's Orders"))
    ) {
      return formatList.filter(
        (f: Format) =>
          f !== Format.GLC &&
          f !== Format.EXPANDED &&
          f !== Format.STANDARD &&
          f !== Format.UNLIMITED &&
          f !== Format.ETERNAL,
      );
    }

    // Check for Unown card restriction
    const hasUnownTag = cards.some((card) => card.tags.includes(CardTag.UNOWN));
    if (hasUnownTag) {
      const unownCount = cards.filter((card) => card.name.includes('Unown')).length;
      if (unownCount > 4) {
        return formatList.filter(
          (f: Format) =>
            f !== Format.GLC &&
            f !== Format.EXPANDED &&
            f !== Format.STANDARD &&
            f !== Format.UNLIMITED &&
            f !== Format.ETERNAL,
        );
      }
    }

    // code for the Arceus Rule
    const hasArceusRule = cards.some((card) => card.tags.includes(CardTag.ARCEUS));
    if (hasArceusRule) {
      const arceusRuleCount = cards.filter((card) => card.tags.includes(CardTag.ARCEUS)).length;
      const arceusCount = cards.filter((card) => card.name === 'Arceus').length;
      if (arceusCount !== arceusRuleCount && arceusCount > 4) {
        return formatList.filter(
          (f: Format) =>
            f !== Format.GLC &&
            f !== Format.EXPANDED &&
            f !== Format.STANDARD &&
            f !== Format.STANDARD_NIGHTLY &&
            f !== Format.UNLIMITED &&
            f !== Format.ETERNAL,
        );
      }
    }

    // Check GLC rules first
    if (formatList.includes(Format.GLC)) {
      // check for singleton violation
      const nonBasicEnergyCards = cards.filter(
        (c) =>
          c.superType !== SuperType.ENERGY && (c as EnergyCard).energyType !== EnergyType.BASIC,
      );
      const singletonSet = new Set(nonBasicEnergyCards.map((c) => c.name));
      if (singletonSet.size < nonBasicEnergyCards.length) {
        formatList = formatList.filter((f: Format) => f !== Format.GLC);
      }
      // check for different type violation
      const pokemonCards = cards.filter((c) => c.superType === SuperType.POKEMON);
      const pokemonTypeSet = new Set(pokemonCards.map((c) => getPrimaryCardType(c as PokemonCard)));
      if (pokemonTypeSet.size > 1) {
        formatList = formatList.filter((f: Format) => f !== Format.GLC);
      }
    }

    if (formatList.includes(Format.ETERNAL)) {
      // "A deck may contain either Crushing Hammer or Energy Removal 2."
      const CrushingHammerPresent = cards.filter((c) => c.name === 'Crushing Hammer');
      const EnergyRemoval2Present = cards.filter((c) => c.name === 'Energy Removal 2');
      if (CrushingHammerPresent.length > 0 && EnergyRemoval2Present.length > 0) {
        formatList = formatList.filter((f: Format) => f !== Format.ETERNAL);
      }
      // Limit number of 0 prizers
      const ZeroPrizerCards = cards.filter(
        (c) =>
          c.name === 'Clefairy Doll' ||
          c.name === 'Mysterious Fossil' ||
          c.name === 'Claw Fossil' ||
          c.name === 'Root Fossil' ||
          c.name === 'Robo Substitute' ||
          c.name === "Lillie's Poké Doll",
      );
      if (ZeroPrizerCards.length > 4) {
        formatList = formatList.filter((f: Format) => f !== Format.ETERNAL);
      }
    }

    // Then check energy type restrictions
    if (set.has('Fairy Energy') || set.has('Wonder Energy')) {
      return formatList.filter((f: Format) => f !== Format.STANDARD && f !== Format.RETRO);
    }

    if (set.has('Metal Energy') || set.has('Darkness Energy')) {
      return formatList.filter((f: Format) => f !== Format.RETRO);
    }

    return formatList;
  }

  // --- getValidFormats ---
  static getValidFormats(card: Card, allCards?: Card[]): Format[] {
    const formats = [Format.UNLIMITED];
    [
      Format.ETERNAL,
      Format.STANDARD,
      Format.STANDARD_NIGHTLY,
      Format.EXPANDED,
      Format.GLC,
      Format.SV,
      Format.SWSH,
      Format.SM,
      Format.XY,
      Format.BW,
      Format.RSPK,
      Format.RETRO,
      // Format.PRE_RELEASE,
    ].forEach((format) => {
      if (this.isValid(card, format, ANY_PRINTING_ALLOWED, allCards)) {
        formats.push(format);
      }
    });

    return formats;
  }

  // --- isValid ---
  static isValid(
    card: Card,
    format: Format,
    anyPrintingAllowed?: string[],
    allCards?: Card[],
  ): boolean {
    if (
      card.superType === SuperType.ENERGY &&
      (card as EnergyCard).energyType === EnergyType.BASIC
    ) {
      return true;
    }
    if (anyPrintingAllowed && anyPrintingAllowed.includes(card.name)) {
      switch (format) {
        case Format.UNLIMITED:
          return true;
        case Format.ETERNAL:
          return !BanLists[format].includes(`${card.name} ${card.set} ${card.setNumber}`);
        case Format.STANDARD: {
          if (allCards) {
            const allPrintings = allCards.filter((c) => c && c.name === card.name);
            if (allPrintings.length === 0) {
              return this.isPrintingLegalInStandard(card);
            }
            return allPrintings.some((c) => this.isPrintingLegalInStandard(c));
          }
          return this.isPrintingLegalInStandard(card);
        }
        case Format.STANDARD_NIGHTLY: {
          if (allCards) {
            const allPrintings = allCards.filter((c) => c && c.name === card.name);
            if (allPrintings.length === 0) {
              return this.isPrintingLegalInStandardNightly(card);
            }
            return allPrintings.some((c) => this.isPrintingLegalInStandardNightly(c));
          }
          return this.isPrintingLegalInStandardNightly(card);
        }
        case Format.EXPANDED: {
          // For anyPrintingAllowed cards, they are known to be legal in Expanded format
          // Just check if this specific printing is not banned
          return !BanLists[format].includes(`${card.name} ${card.set} ${card.setNumber}`);
        }
        case Format.GLC: {
          // For anyPrintingAllowed, do NOT check set date, only tags
          return !(
            card.tags &&
            card.tags.some((t: string) =>
              [
                CardTag.ACE_SPEC.toString(),
                CardTag.POKEMON_EX.toString(),
                CardTag.POKEMON_ex.toString(),
                CardTag.POKEMON_V.toString(),
                CardTag.POKEMON_VMAX.toString(),
                CardTag.POKEMON_VSTAR.toString(),
                CardTag.RADIANT.toString(),
                CardTag.POKEMON_GX.toString(),
                CardTag.PRISM_STAR.toString(),
                CardTag.POKEMON_VUNION.toString(),
              ].includes(t),
            )
          );
        }
        case Format.RETRO:
          return true;
        case Format.BW:
          return true;
        case Format.SWSH:
          return true;
        case Format.XY:
          return true;
        case Format.SM:
          return true;
        case Format.RSPK:
          return true;
        // case Format.PRE_RELEASE:
        //   return true;
      }
    }
    switch (format) {
      case Format.UNLIMITED:
        return true;
      case Format.ETERNAL:
        return !BanLists[format].includes(`${card.name} ${card.set} ${card.setNumber}`);
      case Format.STANDARD:
        return this.isPrintingLegalInStandard(card);
      case Format.STANDARD_NIGHTLY:
        return this.isPrintingLegalInStandardNightly(card);
      case Format.EXPANDED: {
        const setDateExpanded = SetReleaseDates[card.set];
        return (
          setDateExpanded >= new Date('Mon, 25 Apr 2011 00:00:00 GMT') &&
          setDateExpanded <= new Date() &&
          !BanLists[format].includes(`${card.name} ${card.set} ${card.setNumber}`)
        );
      }
      case Format.GLC: {
        const setDateGlc = SetReleaseDates[card.set];
        return (
          setDateGlc >= new Date('Mon, 25 Apr 2011 00:00:00 GMT') &&
          setDateGlc <= new Date() &&
          !(
            card.tags &&
            card.tags.some((t: string) =>
              [
                CardTag.ACE_SPEC.toString(),
                CardTag.POKEMON_EX.toString(),
                CardTag.POKEMON_ex.toString(),
                CardTag.POKEMON_V.toString(),
                CardTag.POKEMON_VMAX.toString(),
                CardTag.POKEMON_VSTAR.toString(),
                CardTag.RADIANT.toString(),
                CardTag.POKEMON_GX.toString(),
                CardTag.PRISM_STAR.toString(),
                CardTag.POKEMON_VUNION.toString(),
              ].includes(t),
            )
          )
        );
      }
      case Format.RETRO:
        return (
          card.set === 'BS' ||
          card.set === 'JU' ||
          card.set === 'FO' ||
          card.set === 'TR' ||
          card.set === 'G1' ||
          card.set === 'G2' ||
          card.set === 'SI' ||
          card.set === 'N1' ||
          card.set === 'N2' ||
          card.set === 'N3' ||
          card.set === 'N4' ||
          card.set === 'LC' ||
          card.set === 'EX' ||
          card.set === 'AQ' ||
          card.set === 'SK' ||
          card.set === 'PR'
        );

      case Format.RSPK:
        return (
          card.set === 'RS' ||
          card.set === 'SS' ||
          card.set === 'DR' ||
          card.set === 'MA' ||
          card.set === 'HL' ||
          card.set === 'RG' ||
          card.set === 'TRR' ||
          card.set === 'DX' ||
          card.set === 'EM' ||
          card.set === 'UF' ||
          card.set === 'DS' ||
          card.set === 'LM' ||
          card.set === 'HP' ||
          card.set === 'CG' ||
          card.set === 'DF' ||
          card.set === 'PK' ||
          card.set === 'P1' ||
          card.set === 'P2' ||
          card.set === 'P3' ||
          card.set === 'P4' ||
          card.set === 'P5' ||
          card.set === 'NP' ||
          card.set === 'MCVS' ||
          card.set === 'MAL' ||
          card.set === 'MSM' ||
          card.set === 'MSD' ||
          card.set === 'PCGP' ||
          card.set === 'PCGL' ||
          card.set === 'VS' ||
          card.set === 'PPF' ||
          card.set === 'PPB' ||
          card.set === 'UP' ||
          card.set === 'GBM'
        );

      case Format.SWSH:
        return (
          card.set === 'SWSH' ||
          card.set === 'SSH' ||
          card.set === 'RCL' ||
          card.set === 'DAA' ||
          card.set === 'CPA' ||
          card.set === 'VIV' ||
          card.set === 'SHF' ||
          card.set === 'BST' ||
          card.set === 'CRE' ||
          card.set === 'EVS' ||
          card.set === 'CEL' ||
          card.set === 'FST' ||
          card.set === 'BRS' ||
          card.set === 'ASR' ||
          card.set === 'PGO' ||
          card.set === 'LOR' ||
          card.set === 'SIT' ||
          card.set === 'CRZ'
        );

      case Format.SM:
        return (
          card.set === 'SUM' ||
          card.set === 'SMP' ||
          card.set === 'SM10a' ||
          card.set === 'GRI' ||
          card.set === 'BUS' ||
          card.set === 'SLG' ||
          card.set === 'CIN' ||
          card.set === 'UPR' ||
          card.set === 'FLI' ||
          card.set === 'CES' ||
          card.set === 'DRM' ||
          card.set === 'LOT' ||
          card.set === 'TEU' ||
          card.set === 'DET' ||
          card.set === 'UNB' ||
          card.set === 'UNM' ||
          card.set === 'HIF' ||
          card.set === 'CEC'
        );

      case Format.XY:
        return (
          card.set === 'XY' ||
          card.set === 'KSS' ||
          card.set === 'FLF' ||
          card.set === 'FFI' ||
          card.set === 'PHF' ||
          card.set === 'PRC' ||
          card.set === 'DCR' ||
          card.set === 'ROS' ||
          card.set === 'AOR' ||
          card.set === 'BKT' ||
          card.set === 'BKP' ||
          card.set === 'GEN' ||
          card.set === 'FCO' ||
          card.set === 'STS' ||
          card.set === 'EVO' ||
          card.set === 'XYP'
        );

      case Format.BW:
        return (
          card.set === 'BW' ||
          card.set === 'EPO' ||
          card.set === 'NVI' ||
          card.set === 'NXD' ||
          card.set === 'DEX' ||
          card.set === 'DRX' ||
          card.set === 'DRV' ||
          card.set === 'BCR' ||
          card.set === 'PLS' ||
          card.set === 'PLF' ||
          card.set === 'PLB' ||
          card.set === 'LTR' ||
          card.set === 'BWP'
        );
      // case Format.PRE_RELEASE:
      //   // Pre-Release format allows all cards (like UNLIMITED)
      //   return true;
    }

    if (
      BanLists[format] &&
      BanLists[format].includes(`${card.name} ${card.set} ${card.setNumber}`)
    ) {
      return false;
    }
    return false;
  }

  /** Standard uses regulation mark H onward when a mark is printed (single-letter marks). */
  private static standardRegulationMarkAllowed(card: Card): boolean {
    const m = (card as Card & { regulationMark?: string }).regulationMark;
    if (!m) {
      return true;
    }
    return m >= 'H';
  }

  // --- isPrintingLegalInStandard ---
  /**
   * Printing release (promo-aware) must be in rotation (>= TEF), released (<= today), and regulation mark H+ when present.
   */
  private static isPrintingLegalInStandard(card: Card): boolean {
    const setDate = getPrintingReleaseDate(card, SetReleaseDates);
    return (
      !!setDate &&
      setDate >= SetReleaseDates['TEF'] &&
      setDate <= new Date() &&
      this.standardRegulationMarkAllowed(card)
    );
  }

  // --- isPrintingLegalInStandardNightly ---
  /**
   * Same regulation rules as Standard, plus not-yet-released sets at or after TEF (e.g. M3, M4).
   */
  private static isPrintingLegalInStandardNightly(card: Card): boolean {
    const setDate = getPrintingReleaseDate(card, SetReleaseDates);
    return (
      !!setDate && setDate >= SetReleaseDates['TEF'] && this.standardRegulationMarkAllowed(card)
    );
  }

  // --- isDeckValidForFormat ---
  /**
   * Checks if a deck is valid for a specific format based on deck size requirements.
   * All formats require 60 cards.
   * When using summary mode (no cards), trusts backend format array if it includes the format.
   * @param deck The deck to validate
   * @param format The format to check validity for
   * @returns true if the deck has the correct size for the format
   */
  static isDeckValidForFormat(deck: DeckListEntry, format: Format): boolean {
    if (!deck) {
      return false;
    }
    if (deck.cards) {
      const requiredDeckSize = 60;
      return deck.cards.length === requiredDeckSize;
    }
    // Summary mode: trust backend format array (backend validates 60 cards)
    return Array.isArray(deck.format) && deck.format.includes(format);
  }
}

// ========== BanLists ==========
export const BanLists: { [key: number]: string[] } = {
  [Format.GLC]: [
    'Palace Book SMP NAN25',
    'Miracle Diamond BRP 1',
    'Mysterious Pearl BRP 2',
    'Wonder Platinum DPt-P 33',
    "Lysandre's Trump Card PHF 99",
    "Lysandre's Trump Card PHF 118",
    'Oranguru UPR 114',
    'Forest of Giant Plants AOR 74',
    'Chip-Chip Ice Axe UNB 165',
    'Hiker CES 133',
    'Hiker HIF SV85',
    'Kyogre SHF 021',
    'Pokémon Research Lab UNM 205',
    'Raikou VIV 50',
    'Duskull CEC 83',
    'Marshadow SLG 45',
    'Marshadow SM 85',
    'Double Colorless Energy XY 130',
    'Double Colorless Energy BS 96',
    'Twin Energy RCL 174',
  ],
  [Format.EXPANDED]: [
    'Palace Book SMP NAN25',
    'Miracle Diamond BRP 1',
    'Mysterious Pearl BRP 2',
    'Wonder Platinum DPt-P 33',
    'Archeops NVI 67',
    'Archeops DEX 110',
    'Chip-Chip Ice Axe UNB 165',
    'Delinquent BKP 98',
    'Delinquent BKP 98a',
    'Delinquent BKP 98b',
    'Flabébé FLI 83',
    'Forest of Giant Plants AOR 74',
    'Ghetsis PLF 101',
    'Ghetsis PLF 115',
    'Hex Maniac AOR 75',
    'Hex Maniac AOR 75a',
    'Island Challenge Amulet CEC 194',
    'Jesse & James HIF 58',
    'Jesse & James HIF 68',
    "Lt. Surge's Strategy UNB 178",
    "Lt. Surge's Strategy HIF 60",
    "Lysandre's Trump Card PHF 99",
    "Lysandre's Trump Card PHF 118",
    'Marshadow SHL 45',
    'Marshadow PR-SM SM85',
    'Milotic FLF 23',
    'Mismagius UNB 78',
    'Oranguru UPR 114',
    'Puzzle of Time BKP 109',
    'Red Card GEN 71',
    'Reset Stamp UNM 206',
    'Reset Stamp UNM 206a',
    'Reset Stamp UNM 253',
    'Sableye DEX 62',
    'Scoop Up Net RCL 165',
    'Scoop Up Net RCL 207',
    'Shaymin-EX ROS 77',
    'Shaymin-EX ROS 77a',
    'Shaymin-EX ROS 106',
    'Unown LOT 90',
    'Unown LOT 91',
    'Duskull CEC 83',
  ],
  [Format.RETRO]: [],
  [Format.UNLIMITED]: [],
  [Format.ETERNAL]: [
    'Forretress LA 28',
    'Forretress ex PAL 230',
    'Forretress ex PAL 5',
    'Forretress ex PAF 2',
    'Forretress ex PAF 212',
    'Muk FO 13',
    'Muk FO 28',
    'Muk LC 16',
    'Dark Vileplume TR 13',
    'Dark Vileplume TR 30',
    'Orbeetle SSH 19',
    'Orbeetle SHF SV009',
    'Rowlet & Alolan Exeggutor-GX UNM 1',
    'Rowlet & Alolan Exeggutor-GX UNM 214',
    'Rowlet & Alolan Exeggutor-GX UNM 215',
    'Rowlet & Alolan Exeggutor-GX UNM 237',
    'Psyduck FO 53',
    'Psyduck PR 20',
    'Psyduck TRR 70',
    'Psyduck PL 87',
    'Psyduck TEU 26',
    'Lapras ex SCR 158',
    'Lapras ex SCR 32',
    'Lapras ex PR-SV 164',
    'Walrein CEC 52',
    'Walrein ex PK 99',
    'Milotic FLF 23',
    'Palkia & Dialga LEGEND TM 101',
    'Palkia & Dialga LEGEND TM 102',
    'Kyogre SHF 21',
    'Seismitoad-EX FFI 106',
    'Seismitoad-EX FFI 20',
    'Magby EX 52',
    'Houndoom UF 7',
    "Brock's Ninetales G2 3",
    'Magby EX 17',
    'Magby N1 23',
    'Electrode BS 21',
    'Electrode B2 25',
    'Electrode ex RG 107',
    'Electrode-GX CES 48',
    'Pichu PR 35',
    'Pichu EX 22',
    'Pichu N1 12',
    'Magnezone PLS 46',
    'Magneton SSP 59',
    'Magneton PR-SV 153',
    'Magneton PR-SV 159',
    'Elekid AQ 9',
    'Electrike DX 59',
    'Dedenne-GX UNB 195',
    'Dedenne-GX UNB 195',
    'Dedenne-GX UNB 219',
    'Dedenne-GX UNB 57',
    'Vikavolt V DAA 180',
    'Vikavolt V DAA 60',
    'Elekid N1 22',
    'Pichu EX 58',
    'Dusknoir SFA 20',
    'Dusknoir SFA 70',
    'Dusknoir PRE 37',
    'Dusclops SFA 19',
    'Dusclops SFA 69',
    'Dusclops PRE 36',
    'Duskull SW 86',
    'Duskull CEC 83',
    'Espeon AQ 11',
    'Espeon AQ H9',
    'Eevee SSP 143',
    'Eevee PRE 74',
    'Naganadel-GX FLI 121',
    'Naganadel-GX FLI 134',
    'Naganadel-GX FLI 56',
    'Naganadel-GX PR-SM SM125',
    'Mr. Mime JU 22',
    'Mr. Mime JU 6',
    'Mr. Mime B2 27',
    'Meloetta ex BLK 159',
    'Meloetta ex BLK 167',
    'Meloetta ex BLK 44',
    'Slowking HS 12',
    'Slowking N1 14',
    'Mismagius UNB 78',
    'Banette ROS 32',
    'Bronzong TEF 69',
    'Uxie LA 43',
    'Giratina PL 9',
    'Giratina LOT 97',
    'Giratina SMP 151',
    'Mewtwo V-UNION SWSH 159',
    'Mewtwo V-UNION SWSH 160',
    'Mewtwo V-UNION SWSH 161',
    'Mewtwo V-UNION SWSH 162',
    'Celebi ex pop2 17',
    'Gengar & Mimikyu-GX TEU 164',
    'Gengar & Mimikyu-GX TEU 165',
    'Gengar & Mimikyu-GX TEU 186',
    'Gengar & Mimikyu-GX TEU 53',
    'Marshadow SLG 45',
    'Marshadow PR-SM SM85',
    'Mew TM 97',
    'Trevenant & Dusknoir-GX PR-SM SM217',
    'Unown LOT 90',
    'Unown LOT 91',
    'Smoochum AQ 61',
    'Smoochum N3 54',
    'Rapid Strike Urshifu VMAX BST 169',
    'Rapid Strike Urshifu VMAX BST 170',
    'Rapid Strike Urshifu VMAX BST 88',
    'Rapid Strike Urshifu VMAX BRS TG21',
    'Rapid Strike Urshifu VMAX BRS TG30',
    'Aerodactyl FO 1',
    'Aerodactyl FO 16',
    'Medicham V EVS 83',
    'Medicham V EVS 185',
    'Medicham V EVS 186',
    'Shuckle PR-HS HGSS15',
    'Tyrogue AQ 63',
    'Tyrogue N2 66',
    'Honchkrow-GX UNB 109',
    'Honchkrow-GX UNB 202',
    'Honchkrow-GX UNB 223',
    'Weavile UD 25',
    'Sableye DEX 62',
    'Sableye SF 48',
    'Spiritomb AR 32',
    'Dialga-GX FLI 125',
    'Dialga-GX FLI 138',
    'Dialga-GX FLI 82',
    'Jirachi Prism Star CES 97',
    'Flabébé FLI 83',
    'Dragapult ex TWM 130',
    'Dragapult ex TWM 200',
    'Dragapult ex PRE 165',
    'Dragapult ex PRE 73',
    'Regidrago VSTAR SIT 136',
    'Regidrago VSTAR SIT 201',
    'Tatsugiri ex SSP 142',
    'Tatsugiri ex SSP 226',
    'Dragonair SUM 95',
    'Dialga-GX UPR 100',
    'Dialga-GX UPR 146',
    'Dialga-GX UPR 164',
    'Garchomp & Giratina-GX UNM 146',
    'Garchomp & Giratina-GX UNM 228',
    'Garchomp & Giratina-GX UNM 247',
    'Garchomp & Giratina-GX PR-SM SM193',
    'Clefable JU 1',
    'Clefable JU 17',
    'Clefable B2 5',
    'Clefairy BS 5',
    'Clefairy B2 6',
    'Clefairy SW 83',
    'Cleffa PR 31',
    'Cleffa SK 48',
    'Lugia VSTAR SIT 139',
    'Lugia VSTAR SIT 202',
    'Lugia VSTAR SIT 211',
    'Igglybuff PR 36',
    'Igglybuff SK 67',
    'Igglybuff N2 40',
    //'Arceus VSTAR BRS 123',
    //'Arceus VSTAR BRS 176',
    //'Arceus VSTAR BRS 184',
    'Archeops SIT 147',
    'Archeops NVI 67',
    'Porygon2 GE 49',
    //'Arceus VSTAR PR-SW SWSH307',
    //'Arceus VSTAR CRZ GG70',
    'Archeops PR-SW SWSH272',
    'Chatot G SV 54',
    'Ditto FO 18',
    'Ditto FO 3',
    'Kecleon RR 67',
    'Oranguru UPR 114',
    'Shaymin-EX ROS 106',
    'Shaymin-EX ROS 77',
    'Shaymin-EX ROS 77a',
    'Smeargle N2 11',
    'Smeargle N2 30',
    'Cleffa N1 20',
    'Acerola BUS 112',
    'Acerola BUS 112a',
    'Acerola BUS 142',
    "Archie's Ace in the Hole PRC 124",
    "Archie's Ace in the Hole PRC 157",
    'Bellelba & Brycen-Man CEC 186',
    "Cheren's Care CRZ GG58",
    "Cheren's Care BRS 134",
    "Cheren's Care BRS 168",
    "Cheren's Care BRS 177",
    'Cyrus Prism Star UPR 120',
    'Delinquent BKP 98',
    'Delinquent BKP 98a',
    'Delinquent BKP 98b',
    'Eri TEF 146',
    'Eri TEF 199',
    'Eri TEF 210',
    'Eri PRE 136',
    'Ghetsis PLF 101',
    'Ghetsis PLF 115',
    "Green's Exploration UNB 175",
    "Green's Exploration UNB 209",
    'Hex Maniac AOR 75',
    'Hex Maniac AOR 75a',
    'Hiker CES 133',
    'Hiker sma SV85',
    'Jessie & James HIF 58',
    'Jessie & James HIF 68',
    "Lt. Surge's Strategy UNB 178",
    "Lt. Surge's Strategy HIF 60",
    "Lysandre's Trump Card PHF 118",
    "Lysandre's Trump Card PHF 99",
    "Maxie's Hidden Ball Trick PRC 133",
    "Maxie's Hidden Ball Trick PRC 158",
    'Misty & Lorelei CEC 199',
    "Mr. Briney's Compassion DR 87",
    'Penny SVI 183',
    'Penny SVI 239',
    'Penny SVI 252',
    'Penny PAF 239',
    'Salvatore TEF 160',
    'Salvatore TEF 202',
    'Salvatore TEF 212',
    'Seeker TM 88',
    'Wally GEN RC27',
    'Wally ROS 107',
    'Wally ROS 94',
    "Wally's Training SS 89",
    "Xerosic's Machinations SFA 64",
    "Xerosic's Machinations SFA 89",
    "Blaine's Gamble G1 121",
    "Blaine's Quiz #1 G1 97",
    "Blaine's Quiz #2 G2 111",
    "Blaine's Quiz #3 G2 112",
    'Double Gust N1 100',
    'Energy Removal BS 92',
    'Gambler FO 60',
    'Giovanni G2 18',
    'Gust of Wind BS 93',
    "Imposter Oak's Revenge TR 76",
    'Item Finder BS 74',
    'Lass BS 75',
    "Misty's Wrath G1 114",
    'Mr. Fuji FO 58',
    'Professor Oak BS 88',
    "Rocket's Sneak Attack TR 16",
    "Sabrina's Gaze G1 125",
    'Scoop Up BS 78',
    'Secret Mission G1 118',
    'Super Energy Removal BS 79',
    'Super Energy Removal 2 AQ 134',
    "The Rocket's Trap G1 19",
    'Trash Exchange G1 126',
    'Boost Shake EVS 142',
    'Boost Shake EVS 229',
    'Chip-Chip Ice Axe UNB 165',
    'Junk Arm TM 87',
    'Lost Blender LOT 181',
    'Lost Blender LOT 233',
    'Poké Drawer + SF 89',
    'Puzzle of Time BKP 109',
    'Red Card GEN 71',
    'Red Card XY 124',
    'Reset Stamp UNM 206',
    'Reset Stamp UNM 206a',
    'Reset Stamp UNM 253',
    'Scoop Up Net RCL 165',
    'Swoop! Teleporter TRR 92',
    "Team Galactic's Invention G-105 Poké Turn PL 118",
    'Thought Wave Machine N4 96',
    'Tickling Machine G1 119',
    'Area Zero Underdepths SCR 131',
    'Area Zero Underdepths SCR 174',
    'Area Zero Underdepths PRE 94',
    'Black Market ◇ TEU 134',
    'Broken Time-Space PL 104',
    'Chaos Gym G2 102',
    'Forest of Giant Plants AOR 74',
    'Forest of Vitality MEG 117',
    'Holon Circle CG 79',
    'Lost World CL 81',
    'Narrow Gym G1 124',
    'Silent Lab PRC 140',
    'Tropical Beach PR-BLW BW28',
    'Tropical Beach PR-BLW BW50',
    'Focus Band N1 86',
    'Island Challenge Amulet CEC 194',
    'Island Challenge Amulet CEC 265',
    'Star Piece SK 139',
    'Technical Machine TS-1 LA 136',
    'Technical Machine: Evolution PAR 178',
  ],
  [Format.STANDARD]: [],
  [Format.STANDARD_NIGHTLY]: [],
  [Format.BW]: [],
  [Format.XY]: [],
  [Format.SM]: [],
  [Format.SWSH]: [],
};

// ========== SetReleaseDates ==========

export const SetReleaseDates: { [key: string]: Date } = {
  BS: new Date('1999-01-09'),
  JU: new Date('1999-06-16'),
  FO: new Date('1999-10-10'),
  TR: new Date('2000-04-24'),
  G1: new Date('2000-08-14'),
  G2: new Date('2000-10-16'),
  N1: new Date('2000-12-16'),
  N2: new Date('2001-06-01'),
  N3: new Date('2001-09-21'),
  N4: new Date('2002-02-28'),
  LC: new Date('2002-05-24'),
  EX: new Date('2002-09-15'),
  AQ: new Date('2003-01-15'),
  SK: new Date('2003-05-12'),
  RS: new Date('2003-07-18'),
  SS: new Date('2003-09-18'),
  DR: new Date('2003-11-24'),
  MA: new Date('2004-03-15'),
  HL: new Date('2004-06-14'),
  FL: new Date('2004-08-30'),
  TRR: new Date('2004-11-08'),
  DX: new Date('2005-02-14'),
  EM: new Date('2005-05-09'),
  UF: new Date('2005-08-22'),
  DS: new Date('2005-10-31'),
  LM: new Date('2006-02-13'),
  HP: new Date('2006-05-03'),
  CG: new Date('2006-08-30'),
  DF: new Date('2006-11-08'),
  PK: new Date('2007-02-14'),
  DP: new Date('2007-05-23'),
  MT: new Date('2007-08-22'),
  SW: new Date('2007-11-07'),
  GE: new Date('2008-02-13'),
  MD: new Date('2008-05-21'),
  LA: new Date('2008-08-20'),
  SF: new Date('2008-11-05'),
  PL: new Date('2009-02-11'),
  RR: new Date('2009-05-16'),
  SV: new Date('2009-08-19'),
  AR: new Date('2009-11-04'),
  HS: new Date('2010-02-10'),
  UL: new Date('2010-05-12'),
  UD: new Date('2010-08-18'),
  TM: new Date('2010-11-03'),
  CL: new Date('2011-02-09'),
  BWP: new Date('2011-04-25'),
  BLW: new Date('2011-04-25'),
  EPO: new Date('2011-08-31'),
  NVI: new Date('2011-11-16'),
  NXD: new Date('2012-02-08'),
  DEX: new Date('2012-05-09'),
  DRX: new Date('2012-08-15'),
  DRV: new Date('2012-10-05'),
  BCR: new Date('2012-11-07'),
  PLS: new Date('2013-02-06'),
  PLF: new Date('2013-05-08'),
  PLB: new Date('2013-08-14'),
  LTR: new Date('2013-11-06'),
  KSS: new Date('2013-11-08'),
  XY: new Date('2014-02-05'),
  FLF: new Date('2014-05-07'),
  FFI: new Date('2014-08-13'),
  PHF: new Date('2014-11-05'),
  PRC: new Date('2015-02-04'),
  DCR: new Date('2015-03-25'),
  ROS: new Date('2015-05-06'),
  AOR: new Date('2015-08-12'),
  BKT: new Date('2015-11-04'),
  BKP: new Date('2016-02-03'),
  GEN: new Date('2016-02-22'),
  FCO: new Date('2016-05-02'),
  STS: new Date('2016-08-03'),
  EVO: new Date('2016-11-02'),
  XYP: new Date('2016-03-19'),
  SUM: new Date('2017-02-03'),
  SMP: new Date('2017-02-03'),
  SM10a: new Date('2017-02-03'),
  GRI: new Date('2017-05-05'),
  BUS: new Date('2017-08-04'),
  SLG: new Date('2017-10-06'),
  CIN: new Date('2017-11-03'),
  UPR: new Date('2018-02-02'),
  FLI: new Date('2018-04-05'),
  CES: new Date('2018-03-08'),
  DRM: new Date('2018-07-09'),
  LOT: new Date('2018-11-02'),
  TEU: new Date('2019-01-02'),
  DET: new Date('2019-03-29'),
  UNB: new Date('2019-03-05'),
  UNM: new Date('2019-02-08'),
  HIF: new Date('2019-08-23'),
  CEC: new Date('2019-11-01'),
  SWSH: new Date('2020-02-07'),
  SSH: new Date('2020-02-07'),
  RCL: new Date('2020-05-01'),
  DAA: new Date('2020-08-14'),
  CPA: new Date('2020-09-25'),
  VIV: new Date('2020-11-13'),
  SHF: new Date('2021-02-19'),
  BST: new Date('2021-03-19'),
  CRE: new Date('2021-06-18'),
  EVS: new Date('2021-08-27'),
  CEL: new Date('2021-10-08'),
  FST: new Date('2021-11-12'),
  BRS: new Date('2022-02-25'),
  ASR: new Date('2022-05-27'),
  PGO: new Date('2022-07-01'),
  LOR: new Date('2022-09-09'),
  SIT: new Date('2022-11-11'),
  CRZ: new Date('2023-01-20'),
  SVP: new Date('2023-03-31'),
  SVI: new Date('2023-03-31'),
  PAL: new Date('2023-06-09'),
  OBF: new Date('2023-08-11'),
  MEW: new Date('2023-09-22'),
  PAR: new Date('2023-11-03'),
  PAF: new Date('2024-01-26'),
  TEF: new Date('2024-03-22'),
  TWM: new Date('2024-05-22'),
  SFA: new Date('2024-08-02'),
  SCR: new Date('2024-09-13'),
  SSP: new Date('2024-11-08'),
  PRE: new Date('2025-01-17'),
  JTG: new Date('2025-03-28'),
  DRI: new Date('2025-05-17'),
  BLK: new Date('2025-07-18'),
  WHT: new Date('2025-07-18'),
  MEP: new Date('2025-09-26'),
  'M-P': new Date('2025-09-26'),
  MEG: new Date('2025-09-26'),
  PFL: new Date('2025-11-14'),
  ASC: new Date('2026-01-28'),
  MC: new Date('2026-03-27'),
  M3: new Date('2026-03-27'),
  POR: new Date('2026-03-27'),
  M4: new Date('2026-05-22'),
  CRI: new Date('2026-05-22'),
  M5: new Date('2026-05-23'),
  PBL: new Date('2026-07-16'),
  M6: new Date('2026-11-06'),
  'J-MEE': new Date("2026-11-06"),
  'J-MEZ': new Date("2026-11-06"),
  'J-MEM': new Date("2026-11-06"),
  M6a: new Date('2026-09-16'),
  '30C': new Date('2026-09-16'),
  FLO: new Date('2026-11-27'),
  M7: new Date('2026-11-27'),
};

// ========== Constants ==========

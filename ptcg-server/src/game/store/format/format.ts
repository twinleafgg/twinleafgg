import { Card } from '../card/card';
import { PokemonCard } from '../card/pokemon-card';
import { CARD_TEXT_IDENTICAL } from '../prefabs/formats';
import { Erratum, GameplayRule } from './format-types';
import { Format as FormatId } from '../card/card-types';
import { Rules } from '../state/rules';

type CardNameAndSet = { name: string; set: string; setNumber: string };

/**
 * Base class for all formats.
 */
export abstract class Format {
  public abstract name: string; // Display name, e.g. "2010 Worlds"
  public shortName: string = ''; // Use for set span identifiers where appropriate, e.g. "DP-UL"
  public abstract fullName: string; // Database identifier. Do not change these!
  public formatId: FormatId = FormatId.NONE;

  public minimumDeckSize = 60;
  public maximumDeckSize = 60;
  public numPrizeCards = 6;

  public gameplayRules: GameplayRule[] = [
    GameplayRule.T1_FIRST_NO_ATTACK,
    GameplayRule.T1_FIRST_NO_SUPPORTER,
  ];

  public errata: Erratum[] = [Erratum.TOOLS_ARE_NOT_ITEMS];
  public ruleOverrides: Partial<Rules> = {};
}

/**
 * A format where players build their own decks according to certain rules.
 */
export abstract class ConstructedFormat extends Format {
  constructor() {
    super();
  }

  /**
   * Returns `true` if the provided card is legal in this format, `false` otherwise.
   * This should only be used on init, and its results cached in legalCards. Use validateCard() to check if a card is legal during runtime.
   * @param card The card to check
   */
  abstract isCardLegal(card: Card, allCards?: Card[]): boolean;

  /**
   * Returns `true` if the provided card is legal in this format, `false` otherwise. Handles reprints.
   * @param card The card to check
   */
  public validateCard(card: Card): boolean {
    var isLegal = true;

    // Firstly, if there aren't any cards with the same name in this format, we can just say no
    var cardsWithSameNameInThisFormat = this.legalCards.get(card.name) || [];
    if (cardsWithSameNameInThisFormat.length == 0) return false;

    // If there *is* a hit and this card isn't a Pokémon we can just return true at this point
    if (!(card instanceof PokemonCard)) return true;

    isLegal = false;
    // If there are matches, for each card in samename, check if they're the exact same card.
    // If it's not yet a hit, check if there's a mon with identical text in format
    for (let checkCard of cardsWithSameNameInThisFormat) {
      isLegal ||= card.fullName == checkCard.fullName;
      isLegal ||= CARD_TEXT_IDENTICAL(card, checkCard as PokemonCard);
    }

    return isLegal;
  }

  /**
   * Returns `true` if the provided list of cards is a legal deck in this format, `false` otherwise.
   * @param deck The deck to check
   */
  public isDeckLegal(deck: Card[]): boolean {
    // null is not legal
    if (!deck) return false;

    var isLegal = true;

    // Deck size check
    isLegal &&= deck.length >= this.minimumDeckSize;
    isLegal &&= deck.length <= this.maximumDeckSize;

    // Card legality check
    for (let card of deck) {
      isLegal &&= this.validateCard(card);
    }

    return isLegal;
  }

  /**
   * Precomputed list of legal cards in this format.
   */
  legalCards: Map<string, Card[]> = new Map();

  /**
   * Convenience list to disallow specific cards at a more granular level.
   */
  banlist: CardNameAndSet[] = []; // For convenience's sake

  /**
   * Check if the provided card is on the banlist for this format.
   * The banlist is list of objects in the format { name: string; set: string; setNumber: string }.
   * Use `"*"` as a wildcard for either set or set number.
   * @param card The card to check
   * @returns `true` if the card is on the banlist, `false` otherwise
   */
  public isCardOnBanlist(card: Card): boolean {
    for (var bannedCard of this.banlist) {
      if (
        card.name == bannedCard.name && // No wildcards for card name. If you want to disallow an entire set, change the legality rules in isDeckLegal.
        (bannedCard.set == '*' || card.set == bannedCard.set) &&
        (bannedCard.setNumber == '*' || card.setNumber == bannedCard.setNumber)
      )
        return true;
    }

    return false;
  }
}

import { CardTag, CardType, SuperType, TrainerType } from '../card/card-types';

/**
 * Duck-typed so this module does not import Card / PokemonCard / EnergyCard.
 * CardList.filter loads this during card-list init; pulling those classes in
 * would cycle through card.ts (which constructs CardList) and leave Card undefined.
 */
export interface PromptFilterCard {
  superType: SuperType;
  cardType?: CardType[] | CardType;
  provides?: CardType[] | CardType;
  /** Present on class instances. Client state cards are plain JSON and only have `tags`. */
  tags?: CardTag[];
  hasTag?(tag: CardTag): boolean;
  trainerType?: TrainerType;
  _trainerType?: TrainerType;
}

function asTypeList(value: unknown): CardType[] {
  if (value == null) {
    return [];
  }
  return (Array.isArray(value) ? value : [value]) as CardType[];
}

function cardHasTag(card: PromptFilterCard, tag: CardTag): boolean {
  if (typeof card.hasTag === 'function') {
    return card.hasTag(tag);
  }
  return Array.isArray(card.tags) && card.tags.includes(tag);
}

function cardTrainerType(card: PromptFilterCard): TrainerType | undefined {
  if (card.trainerType != null) {
    return card.trainerType;
  }
  return card._trainerType;
}

/**
 * Prompt filters used to compare every key with !==. That fails now that
 * cardType (and tags) are arrays, and Energy stores types on provides rather
 * than cardType. Trainer type is a getter, so client cards only have
 * `_trainerType`. Scalar keys still use !==.
 */
export function matchesPromptFilter(card: PromptFilterCard | null | undefined, filter: object): boolean {
  if (!card) {
    return false;
  }
  for (const key in filter) {
    if (!Object.prototype.hasOwnProperty.call(filter, key)) {
      continue;
    }
    const expected = (filter as Record<string, unknown>)[key];
    if (key === 'cardType') {
      const wanted = asTypeList(expected);
      if (card.superType === SuperType.ENERGY) {
        const provides = asTypeList(card.provides);
        if (!wanted.every(type => provides.includes(type))) {
          return false;
        }
      } else if (card.superType === SuperType.POKEMON) {
        const types = asTypeList(card.cardType);
        if (!wanted.every(type => types.includes(type))) {
          return false;
        }
      } else {
        return false;
      }
      continue;
    }
    if (key === 'tags') {
      const wanted = (Array.isArray(expected) ? expected : [expected]) as CardTag[];
      if (!wanted.every(tag => cardHasTag(card, tag))) {
        return false;
      }
      continue;
    }
    if (key === 'trainerType') {
      if (expected !== cardTrainerType(card)) {
        return false;
      }
      continue;
    }
    if (expected !== (card as unknown as Record<string, unknown>)[key]) {
      return false;
    }
  }
  return true;
}

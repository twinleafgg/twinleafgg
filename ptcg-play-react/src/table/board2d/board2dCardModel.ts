import {
  BoardEffect,
  CardList,
  CardTag,
  PokemonCardList,
  SpecialCondition,
  StadiumDirection,
  SuperType,
  type Card,
} from 'ptcg-server';
import { resolveDualStadiumDisplayHalves } from '../board3d/dual-stadium.utils';
import { resolveLegendDisplayHalves } from '../board3d/legend-display.utils';

const MAX_ENERGY_CARDS = 8;

export type Board2dCardModel = {
  isEmpty: boolean;
  mainCard?: Card;
  breakCard?: Card;
  legendTopCard?: Card;
  legendBottomCard?: Card;
  vunionTopLeftCard?: Card;
  vunionTopRightCard?: Card;
  vunionBottomLeftCard?: Card;
  vunionBottomRightCard?: Card;
  dualStadiumLeftCard?: Card;
  dualStadiumRightCard?: Card;
  energyCards: Card[];
  moreEnergies: number;
  tools: Card[];
  damage: number;
  specialConditions: SpecialCondition[];
  boardEffect: BoardEffect[];
  hasImprisonMarker: boolean;
  cardCount: number;
  isFaceDown: boolean;
  stadiumDirectionDown: boolean;
};

function emptyModel(overrides: Partial<Board2dCardModel> = {}): Board2dCardModel {
  return {
    isEmpty: true,
    energyCards: [],
    moreEnergies: 0,
    tools: [],
    damage: 0,
    specialConditions: [],
    boardEffect: [],
    hasImprisonMarker: false,
    cardCount: 0,
    isFaceDown: false,
    stadiumDirectionDown: false,
    ...overrides,
  };
}

function cardHasTag(card: Card | undefined, tag: CardTag): boolean {
  // Socket state cards are plain objects — no Card.prototype.hasTag.
  return !!card?.tags?.includes(tag);
}

function getBreakDisplay(cardList: PokemonCardList): { mainCard?: Card; breakCard?: Card } {
  const pokemon = cardList.getPokemonCard();
  if (!pokemon) {
    return {};
  }
  if (cardHasTag(pokemon, CardTag.BREAK)) {
    const prior = [...cardList.cards]
      .reverse()
      .find(
        (c) =>
          c.superType === SuperType.POKEMON &&
          c !== pokemon &&
          !cardHasTag(c, CardTag.BREAK),
      );
    return { mainCard: prior ?? pokemon, breakCard: pokemon };
  }
  return { mainCard: pokemon };
}

export function buildBoard2dCardModel(
  cardList: CardList | PokemonCardList | null | undefined,
  owner: boolean,
  forceFaceDown = false,
): Board2dCardModel {
  if (!cardList || !cardList.cards?.length) {
    return emptyModel();
  }

  const isSecret = !!cardList.isSecret;
  const isPublic = !!cardList.isPublic;
  const isFaceDown = forceFaceDown || isSecret || (!isPublic && !owner);
  const stadiumDirectionDown = cardList.stadiumDirection === StadiumDirection.DOWN;

  if (cardList instanceof PokemonCardList) {
    const { mainCard, breakCard } = getBreakDisplay(cardList);
    const energyCards: Card[] = [];
    let moreEnergies = 0;
    for (const card of cardList.energies?.cards ?? []) {
      if (energyCards.length < MAX_ENERGY_CARDS) {
        energyCards.push(card);
      } else {
        moreEnergies++;
      }
    }

    const { top, bottom } = resolveLegendDisplayHalves(cardList);
    const legendTopCard = top;
    const legendBottomCard = bottom;
    const showLegendStack = !!(legendTopCard && legendBottomCard);

    const pokemonCard = cardList.getPokemonCard();
    let vunionTopLeftCard: Card | undefined;
    let vunionTopRightCard: Card | undefined;
    let vunionBottomLeftCard: Card | undefined;
    let vunionBottomRightCard: Card | undefined;
    if (cardHasTag(pokemonCard, CardTag.POKEMON_VUNION)) {
      vunionTopLeftCard = cardList.cards.find((c) => c.fullName.includes('(Top Left)'));
      vunionTopRightCard = cardList.cards.find((c) => c.fullName.includes('(Top Right)'));
      vunionBottomLeftCard = cardList.cards.find((c) => c.fullName.includes('(Bottom Left)'));
      vunionBottomRightCard = cardList.cards.find((c) => c.fullName.includes('(Bottom Right)'));
    }

    return {
      isEmpty: false,
      mainCard: showLegendStack ? undefined : mainCard,
      breakCard,
      legendTopCard,
      legendBottomCard,
      vunionTopLeftCard,
      vunionTopRightCard,
      vunionBottomLeftCard,
      vunionBottomRightCard,
      energyCards,
      moreEnergies,
      tools: [...(cardList.tools ?? [])],
      damage: cardList.damage ?? 0,
      specialConditions: [...(cardList.specialConditions ?? [])],
      boardEffect: [...(cardList.boardEffect ?? [])],
      hasImprisonMarker: !!cardList.marker?.hasMarker?.('IMPRISON_MARKER'),
      cardCount: cardList.cards.length,
      isFaceDown,
      stadiumDirectionDown,
    };
  }

  const dual = resolveDualStadiumDisplayHalves(cardList.cards);
  if (dual) {
    return emptyModel({
      isEmpty: false,
      dualStadiumLeftCard: dual[0],
      dualStadiumRightCard: dual[1],
      cardCount: cardList.cards.length,
      isFaceDown,
      stadiumDirectionDown,
    });
  }

  return emptyModel({
    isEmpty: false,
    mainCard: cardList.cards[cardList.cards.length - 1],
    cardCount: cardList.cards.length,
    isFaceDown,
    stadiumDirectionDown,
  });
}

export { BoardEffect, SpecialCondition };

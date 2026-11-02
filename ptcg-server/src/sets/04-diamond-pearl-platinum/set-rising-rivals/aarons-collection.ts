import { Card, ChooseCardsPrompt, EnergyCard, GameError, GameMessage, Player, PokemonCard, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, EnergyType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

function isAaronTarget(card: Card): boolean {
  if (card instanceof PokemonCard && card.hasTag(CardTag.POKEMON_SP)) {
    return true;
  }
  return card instanceof EnergyCard && card.energyType === EnergyType.BASIC;
}

function* playCard(next: Function, store: StoreLike, state: State, self: AaronsCollection, effect: TrainerEffect): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  let cards: Card[] = [];

  if (player.supporterTurn > 0) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  if (!player.discard.cards.some(c => isAaronTarget(c))) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  MOVE_CARDS(store, state, player.hand, player.supporter, { cards: [effect.trainerCard], sourceCard: self });
  effect.preventDefault = true;

  const blocked: number[] = [];
  player.discard.cards.forEach((c, index) => {
    if (!isAaronTarget(c)) {
      blocked.push(index);
    }
  });

  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARDS,
    player.discard,
    {},
    { min: 0, max: 2, allowCancel: false, blocked }
  ), selected => {
    cards = selected || [];
    next();
  });

  if (cards.length > 0) {
    MOVE_CARDS(store, state, player.discard, player.hand, { cards, sourceCard: self });
    SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
  }

  return state;
}

export class AaronsCollection extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '88';
  public name: string = 'Aaron\'s Collection';
  public fullName: string = 'Aaron\'s Collection RR';
  public text: string = 'Search your discard pile for up to 2 in any combination of Pokémon SP and basic Energy cards, show them to your opponent, and put them into your hand.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    return player.discard.cards.some(c => isAaronTarget(c));
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    return state;
  }
}

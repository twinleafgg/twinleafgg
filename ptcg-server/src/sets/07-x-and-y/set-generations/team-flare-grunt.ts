import {
  StoreLike,
  State,
  StateUtils,
  SuperType,
  GameError,
  GameMessage,
  PokemonCardList,
  Card,
  ChooseCardsPrompt,
  TrainerCard,
  TrainerType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { TRAINER_TARGET_BLOCKED } from '../../../game/store/prefabs/trainer-target';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  effect: TrainerEffect,
  trainerCard: TeamFlareGrunt,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  const activeHasEnergy = opponent.active.cards.some((c) => c.superType === SuperType.ENERGY);

  if (!activeHasEnergy) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  if (player.supporterTurn >= 1) {
    throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
  }

  MOVE_CARDS(store, state, player.hand, player.supporter, {
    cards: [effect.trainerCard],
    sourceCard: effect.trainerCard,
  });
  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  const target: PokemonCardList = opponent.active as PokemonCardList;

  if (TRAINER_TARGET_BLOCKED(store, state, player, trainerCard, target)) {
    return state;
  }

  let cards: Card[] = [];

  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_DISCARD,
      target,
      { superType: SuperType.ENERGY },
      { min: 1, max: 1, allowCancel: false },
    ),
    (selected) => {
      cards = selected;
      next();
    },
  );
  MOVE_CARDS(store, state, target, opponent.discard, {
    cards: cards,
    sourceCard: effect.trainerCard,
  });
  return state;
}

export class TeamFlareGrunt extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;
  public set: string = 'GEN';
  public name: string = 'Team Flare Grunt';
  public fullName: string = 'Team Flare Grunt GEN';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '73';
  public text: string = "Discard an Energy attached to your opponent's Active Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const generator = playCard(() => generator.next(), store, state, effect, this);
      return generator.next().value;
    }

    return state;
  }
}

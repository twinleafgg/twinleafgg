import {
  CardTag,
  EnergyType,
  Stage,
  SuperType,
  TrainerType,
} from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  Card,
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  Player,
  PokemonCard,
  State,
  StateUtils,
  StoreLike,
  TrainerCard,
} from '../../../game';
import {
  MOVE_CARDS,
  SHOW_CARDS_TO_PLAYER,
  SHUFFLE_DECK,
} from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

function isTeamAquaGreatBallCard(card: Card): boolean {
  return (
    (card instanceof PokemonCard && card.stage === Stage.BASIC && card.hasTag(CardTag.TEAM_AQUA)) ||
    (card.superType === SuperType.ENERGY &&
      card.energyType === EnergyType.BASIC &&
      card.name === 'Water Energy')
  );
}

function* playCard(
  next: Function,
  store: StoreLike,
  state: State,
  self: TeamAquasGreatBall,
  effect: TrainerEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  const blocked: number[] = [];
  player.deck.cards.forEach((card, index) => {
    if (!isTeamAquaGreatBallCard(card)) {
      blocked.push(index);
    }
  });

  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.deck,
      {},
      { min: 0, max: 1, allowCancel: true, blocked },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  if (cards.length === 0) {
    return state;
  }

  MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard: self });
  SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);

  return SHUFFLE_DECK(store, state, player);
}

export class TeamAquasGreatBall extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags: CardTag[] = [CardTag.BALL];
  public set: string = 'DCR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '27';
  public name: string = "Team Aqua's Great Ball";
  public fullName: string = "Team Aqua's Great Ball DCR";

  public text: string =
    'Search your deck for a Basic Team Aqua Pokémon and a basic [W] Energy card, reveal them, and put them into your hand. Shuffle your deck afterward.';

  public canPlay(_store: StoreLike, _state: State, player: Player): boolean {
    return player.deck.cards.length > 0;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      if (!this.canPlay(store, state, player)) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });

      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    return state;
  }
}

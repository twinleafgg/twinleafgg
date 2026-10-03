import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, TrainerType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  Card,
  TrainerCard,
  ChooseCardsPrompt,
  GameMessage,
  ShowCardsPrompt,
  ShuffleDeckPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useMixedCall(
  next: Function,
  store: StoreLike,
  state: State,
  self: Oricorio,
  effect: AttackEffect,
): IterableIterator<State> {
  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);
  let cards: Card[] = [];

  // Count pokemon and supporters separately
  let pokemon = 0;
  let supporters = 0;
  const blocked: number[] = [];
  player.deck.cards.forEach((c, index) => {
    if (c instanceof PokemonCard) {
      pokemon++;
    } else if (c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER) {
      supporters++;
    } else {
      blocked.push(index);
    }
  });

  const maxPokemons = Math.min(pokemon, 1);
  const maxSupporters = Math.min(supporters, 1);

  const count = maxPokemons + maxSupporters;

  // Pass max counts to prompt options
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_ONE_POKEMON_AND_ONE_SUPPORTER_TO_HAND,
      player.deck,
      {},
      { min: 0, max: count, allowCancel: false, blocked, maxPokemons, maxSupporters },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: self });

  if (cards.length > 0) {
    yield store.prompt(
      state,
      new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
      () => next(),
    );
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class Oricorio extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.PSYCHIC];
  public hp: number = 90;
  public weakness = [{ type: CardType.DARK }];
  public resistance = [{ type: CardType.FIGHTING, value: -30 }];
  public retreat = [CardType.COLORLESS];
  protected _tags = [CardTag.FUSION_STRIKE];

  public attacks = [
    {
      name: 'Mixed Call',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: 'Search your deck for a Pokémon and a Supporter card, reveal them, and put them into your hand. Then, shuffle your deck.',
    },
    {
      name: 'Razor Wing',
      cost: [CardType.PSYCHIC, CardType.COLORLESS, CardType.COLORLESS],
      damage: 80,
      text: '',
    },
  ];

  public regulationMark = 'E';
  public set: string = 'SWSH';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Oricorio';
  public fullName: string = 'Oricorio SWSH';
  public setNumber: string = '210';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useMixedCall(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    return state;
  }
}

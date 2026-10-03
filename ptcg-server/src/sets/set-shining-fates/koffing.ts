import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../game/store/card/card-types';
import { AttackEffect } from '../../game/store/effects/game-effects';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { ChooseCardsPrompt } from '../../game/store/prompts/choose-cards-prompt';
import { Card } from '../../game/store/card/card';
import { GameMessage } from '../../game/game-message';
import { ShuffleDeckPrompt } from '../../game/store/prompts/shuffle-prompt';
import { Effect } from '../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

function* useAscension(
  next: Function,
  store: StoreLike,
  state: State,
  effect: AttackEffect,
): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length === 0) {
    return state;
  }

  let cards: Card[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_EVOLVE,
      player.deck,
      {
        superType: SuperType.POKEMON,
        stage: Stage.STAGE_1,
        evolvesFrom: 'Koffing',
      },
      { min: 1, max: 1, allowCancel: true },
    ),
    (selected) => {
      cards = selected || [];
      next();
    },
  );

  if (cards.length > 0) {
    // Evolve Pokemon
    MOVE_CARDS(store, state, player.deck, player.active, { cards: cards, sourceCard: effect.source.getPokemonCard()! });
    player.active.clearEffects();
    player.active.pokemonPlayedTurn = state.turn;
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class Koffing extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [D];
  public regulationMark = 'D';
  public hp: number = 60;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Ascension',
      cost: [D],
      damage: 0,
      text: 'Search your deck for a card that evolves from this Pokémon and put it onto this Pokémon to evolve it. Then, shuffle your deck.',
    },
  ];

  public set: string = 'SHF';
  public name: string = 'Koffing';
  public fullName: string = 'Koffing SHF 41';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '41';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useAscension(
        () => generator.next(),
        store,
        state,
        effect,
      );
      return generator.next().value;
    }

    return state;
  }
}

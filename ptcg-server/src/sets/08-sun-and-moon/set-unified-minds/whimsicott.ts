import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameMessage, PowerType, ShuffleDeckPrompt, State, StoreLike } from '../../../game';
import { Effect, PowerEffect } from '../../../game/store/effects/game-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {IS_ABILITY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useProwl(next: Function, store: StoreLike, state: State,
  self: Whimsicott, effect: PlayPokemonEffect): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length === 0) {
    return state;
  }

  // Try to reduce PowerEffect, to check if something is blocking our ability
  try {
    const stub = new PowerEffect(player, {
      name: 'test',
      powerType: PowerType.ABILITY,
      text: ''
    }, self);
    store.reduceEffect(state, stub);
  } catch {
    return state;
  }

  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_HAND,
    player.deck,
    {},
    { min: 1, max: 1, allowCancel: true }
  ), selected => {
    const cards = selected || [];
    MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: self });
    next();
  });

  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);
  });
}

export class Whimsicott extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public cardType: CardType[] = [Y];
  public hp: number = 80;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public evolvesFrom: string = 'Cottonee';

  public powers = [{
    name: 'Prowl',
    powerType: PowerType.ABILITY,
    text: 'When you play this Pokemon from your hand to evolve 1 of your ' +
      'Pokemon, you may search your deck for any card and put it into your ' +
      'hand. Shuffle your deck afterward.'
  }];

  public attacks = [{
    name: 'Gust',
    cost: [C],
    damage: 40,
    text: ''
  }];

  public set: string = 'UNM';
  public name: string = 'Whimsicott';
  public fullName: string = 'Whimsicott UNM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '144';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      // Check to see if anything is blocking our Ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const generator = useProwl(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    return state;
  }
}
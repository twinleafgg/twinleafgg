import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, ShuffleDeckPrompt, GameError, GameMessage } from '../../../game';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_POWER_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useExcitableDraw(next: Function, store: StoreLike, state: State,
  effect: PowerEffect): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length + player.hand.cards.length === 0) {
    throw new GameError(GameMessage.CANNOT_USE_POWER);
  }

  let flipResult = false;
  yield COIN_FLIP_PROMPT(store, state, player, result => {
    flipResult = result;
    next();
  });

  if (flipResult) {
    MOVE_CARDS(store, state, player.hand, player.deck, { sourceCard: effect.card });
    yield store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
      player.deck.applyOrder(order);
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 6, sourceCard: effect.card });
      next();
    });
  }

  const endTurnEffect = new EndTurnEffect(player);
  store.reduceEffect(state, endTurnEffect);
  return state;
}

export class Cleffa extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [Y];
  public hp: number = 60;
  public retreat = [];

  public powers = [{
    name: 'Excitable Draw',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may flip a coin. ' +
    'If heads, shuffle your hand into your deck and then draw 6 cards. ' +
    'If you use this Ability, your turn ends.'
  }];

  public set: string = 'UNB';
  public name: string = 'Cleffa';
  public fullName: string = 'Cleffa UNB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '131';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Eeeeeeek
    if (WAS_POWER_USED(effect, 0, this)) {
      const generator = useExcitableDraw(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }

}

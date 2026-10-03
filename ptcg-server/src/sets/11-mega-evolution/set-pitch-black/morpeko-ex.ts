import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import {DRAW_CARDS, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Morpekoex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public hp: number = 180;
  public cardType: CardType[] = [D];
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Wheely Draw',
      cost: [D],
      damage: 0,
      text: 'Shuffle your hand into your deck. Then, draw 6 cards.',
    },
    {
      name: 'Hangry Blaster',
      cost: [D, D],
      damage: 40,
      damageCalculation: '+',
      text: 'This attack does 40 more damage for each damage counter on this Pokémon.',
    },
  ];

  public set: string = 'PBL';
  public setNumber: string = '55';
  public regulationMark: string = 'J';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Morpeko ex';
  public fullName: string = 'Morpeko ex M5';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const copied = [...player.hand.cards];
      copied.forEach((c) => MOVE_CARDS(store, state, player.hand, player.deck, { cards: [c], sourceCard: this }));
      return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
        DRAW_CARDS(store, state, player, 6);
      });
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const counters = Math.floor(effect.source.damage / 10);
      effect.damage += 40 * counters;
    }
    return state;
  }
}

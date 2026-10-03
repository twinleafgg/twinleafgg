import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { ConfirmPrompt, GameMessage, StoreLike, State, StateUtils } from '../../../game';
import { Card } from '../../../game/store/card/card';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Unfezant extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Tranquill';
  public cardType: CardType[] = [C];
  public hp: number = 140;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Gust',
      cost: [C],
      damage: 40,
      text: ''
    },
    {
      name: 'Downburst',
      cost: [C, C, C],
      damage: 90,
      text: 'You may have each player shuffle all cards attached to their Active Pokémon into their deck.'
    }
  ];

  public set: string = 'UNM';
  public setNumber: string = '176';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Unfezant';
  public fullName: string = 'Unfezant UNM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 2: Downburst
    // Ref: set-unbroken-bonds/vikavolt.ts (Electricannon - optional ConfirmPrompt pattern)
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      state = store.prompt(state, new ConfirmPrompt(
        player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToShuffle => {
        if (wantToShuffle) {
          // Shuffle player's active attached cards into deck
          const playerPokemons: Card[] = player.active.getPokemons();
          const playerAttached = player.active.cards.filter(c => !playerPokemons.includes(c));
          playerAttached.forEach(c => {
            MOVE_CARDS(store, state, player.active, player.deck, { cards: [c], sourceCard: this });
          });
          // Also handle tools
          const playerTools = player.active.tools.slice();
          playerTools.forEach(c => {
            MOVE_CARDS(store, state, player.active, player.deck, { cards: [c], sourceCard: this });
          });

          // Shuffle opponent's active attached cards into deck
          const oppPokemons: Card[] = opponent.active.getPokemons();
          const oppAttached = opponent.active.cards.filter(c => !oppPokemons.includes(c));
          oppAttached.forEach(c => {
            MOVE_CARDS(store, state, opponent.active, opponent.deck, { cards: [c], sourceCard: this });
          });
          const oppTools = opponent.active.tools.slice();
          oppTools.forEach(c => {
            MOVE_CARDS(store, state, opponent.active, opponent.deck, { cards: [c], sourceCard: this });
          });

          SHUFFLE_DECK(store, state, player);
          SHUFFLE_DECK(store, state, opponent);
        }
      });
    }

    return state;
  }
}

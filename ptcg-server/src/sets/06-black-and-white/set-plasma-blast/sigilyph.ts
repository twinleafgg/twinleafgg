import { PlayerType, PokemonCard, Stage, CardType, PowerType, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import {IS_ABILITY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Sigilyph extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 90;
  public weakness = [{ type: L }];
  public retreat = [C];
  public resistance = [{ type: F, value: -20 }];

  public powers = [
    {
      name: 'Toolbox',
      powerType: PowerType.ABILITY,
      text: 'This Pokémon may have up to 4 Pokémon Tool cards attached to it. ' +
        '(If this Pokémon loses this Ability, discard Pokémon Tool cards attached to this Pokémon until only 1 Pokémon Tool card remains.)'

    }
  ];

  public attacks = [{ name: 'Cutting Wind', cost: [P, C, C], damage: 70, text: '' }];

  public set: string = 'PLB';
  public setNumber: string = '41';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Sigilyph';
  public fullName: string = 'Sigilyph PLB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach(player => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
          if (card !== this) {
            return;
          }

          // Ref: set-phantasmal-flames/rotom-ex.ts (dynamic maxTools from Ability)
          const abilityBlocked = IS_ABILITY_BLOCKED(store, state, player, this);
          this.maxTools = abilityBlocked ? 1 : 4;

          while (cardList.tools.length > this.maxTools) {
            const tool = cardList.tools[cardList.tools.length - 1];
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [tool], sourceCard: this });
          }
        });
      });
    }

    return state;
  }
}

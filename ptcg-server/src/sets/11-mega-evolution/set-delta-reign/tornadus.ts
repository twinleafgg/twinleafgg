import { CardType, GameMessage, PokemonCard, PowerType, Stage, State, StoreLike } from '../../../game';
import { CheckAttackCostEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS_UNTIL_YOU_HAVE_X_CARDS_IN_HAND } from '../../../game/store/prefabs/attack-effects';
import { CONFIRMATION_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { reduceIncarnateUnionEffect } from './incarnate-union';

export class Tornadus extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 110;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public powers = [{
    name: 'Incarnate Solidarity',
    powerType: PowerType.ABILITY,
    text: 'If you have Tornadus, Thundurus, Landorus, and Enamorus in play, ignore all [C] Energy in the costs of attacks used by this Pokémon.',
  }];

  public attacks = [{
    name: 'Corkscrew Dive',
    cost: [C, C, C],
    damage: 70,
    text: 'You may draw cards until you have 6 cards in your hand.',
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public setNumber: string = '85';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Tornadus';
  public fullName: string = 'Tornadus M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ref: set-furious-fists/politoed.ts (King's Song - CheckAttackCostEffect Colorless removal)
    if (effect instanceof CheckAttackCostEffect) {
      return reduceIncarnateUnionEffect(store, state, effect, this);
    }

    // Ref: set-destined-rivals/cynthias-garchomp-ex.ts (Corkscrew Dive)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.hand.cards.length >= 6 || player.deck.cards.length === 0) {
        return state;
      }

      CONFIRMATION_PROMPT(store, state, player, result => {
        if (result) {
          DRAW_CARDS_UNTIL_YOU_HAVE_X_CARDS_IN_HAND(6, effect, state);
        }
      }, GameMessage.WANT_TO_DRAW_UNTIL_6);
    }

    return state;
  }
}

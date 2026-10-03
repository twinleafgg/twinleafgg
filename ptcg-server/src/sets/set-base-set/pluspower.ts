import { TrainerCard } from '../../game/store/card/trainer-card';
import { TrainerType } from '../../game/store/card/card-types';
import { StoreLike } from '../../game/store/store-like';
import { State } from '../../game/store/state/state';
import { Effect } from '../../game/store/effects/effect';
import { TrainerEffect } from '../../game/store/effects/play-card-effects';
import {
  AfterWeaknessAndResistanceEffect,
  PutDamageEffect,
} from '../../game/store/effects/attack-effects';
import { EndTurnEffect } from '../../game/store/effects/game-phase-effects';
import {MOVE_CARD_TO, MOVE_CARDS } from '../../game/store/prefabs/prefabs';
import { PlayerType } from '../../game';

export class PlusPower extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public set: string = 'BS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '84';
  public name: string = 'PlusPower';
  public fullName: string = 'PlusPower BS';
  public putIntoPlay = true;

  public text: string =
    "Attach PlusPower to your Active Pokémon. At the end of your turn, discard PlusPower. If this Pokémon's attack does damage to the Defending Pokémon (after applying Weakness and Resistance), the attack does 10 more damage to the Defending Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      MOVE_CARD_TO(state, this, player.active);
    }

    if (effect instanceof PutDamageEffect && effect.source.cards.includes(this)) {
      // must deal > 0 damage to active Pokémon
      const target = effect.target;
      if (
        effect.damage &&
        effect.damage > 0 &&
        (effect.target === effect.opponent.active || effect.target === effect.player.active)
      ) {
        const additionalDamageEffect = new AfterWeaknessAndResistanceEffect(
          effect.attackEffect,
          10,
        );
        additionalDamageEffect.target = target;
        store.reduceEffect(state, additionalDamageEffect);
      }
    }

    // Discard PlusPower at the end of the turn
    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, index) => {
        if (cardList.cards.includes(this)) {
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
        }
      });
    }

    return state;
  }
}

import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State, GamePhase } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { StateUtils } from '../../../game/store/state-utils';

import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { ToolEffect } from '../../../game/store/effects/play-card-effects';

export class BoxOfDisaster extends TrainerCard {
  public regulationMark = 'F';

  protected _trainerType: TrainerType = TrainerType.TOOL;

  public set: string = 'LOR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '154';

  public name = 'Box of Disaster';

  public fullName = 'Box of Disaster LOR';

  public damageDealt: boolean = false;

  public text: string =
    "If the Pokémon V this card is attached to has full HP and is Knocked Out by damage from an attack from your opponent's Pokémon, put 8 damage counters on the Attacking Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PutDamageEffect && effect.target.tools.includes(this)) {
      const player = StateUtils.findOwner(state, effect.target);

      const pokemonCard = effect.target.getPokemonCard();
      const sourceCard = effect.source.getPokemonCard();

      if (
        pokemonCard === undefined ||
        sourceCard === undefined ||
        state.phase !== GamePhase.ATTACK
      ) {
        return state;
      }

      this.damageDealt = true;

      // Try to reduce ToolEffect, to check if something is blocking the tool from working
      try {
        const stub = new ToolEffect(effect.player, this);
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      if (this.damageDealt === true) {
        const checkHpEffect = new CheckHpEffect(player, effect.target);
        store.reduceEffect(state, checkHpEffect);

        if (state.phase === GamePhase.ATTACK) {
          if (pokemonCard && pokemonCard.hasTag(CardTag.POKEMON_V)) {
            if (effect.target.damage === 0 && effect.damage >= checkHpEffect.hp) {
              effect.source.damage += 80;
            }
          }
          if (pokemonCard && pokemonCard.hasTag(CardTag.POKEMON_VMAX)) {
            if (effect.target.damage === 0 && effect.damage >= checkHpEffect.hp) {
              effect.source.damage += 80;
            }
          }
          if (pokemonCard && pokemonCard.hasTag(CardTag.POKEMON_VSTAR)) {
            if (effect.target.damage === 0 && effect.damage >= checkHpEffect.hp) {
              effect.source.damage += 80;
            }
          }
        }
      }
    }
    return state;
  }
}

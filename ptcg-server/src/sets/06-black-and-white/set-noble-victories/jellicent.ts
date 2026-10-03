import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, ChooseCardsPrompt, GameMessage } from '../../../game';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, IS_ABILITY_BLOCKED, HEAL_X_DAMAGE_FROM_THIS_POKEMON, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { GamePhase } from '../../../game/store/state/state';

export class Jellicent extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Frillish';
  public cardType: CardType[] = [W];
  public hp: number = 110;
  public weakness = [{ type: L }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Cursed Body',
    powerType: PowerType.ABILITY,
    text: 'If this Pokémon is your Active Pokémon and is damaged by an opponent\'s attack (even if this Pokémon is Knocked Out), discard an Energy attached to the Attacking Pokémon.'
  }];

  public attacks = [{
    name: 'Absorb Life',
    cost: [W, W, C],
    damage: 50,
    text: 'Heal 20 damage from this Pokémon.'
  }];

  public set: string = 'NVI';
  public setNumber: string = '31';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Jellicent';
  public fullName: string = 'Jellicent NVI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cursed Body - discard energy when damaged
    if (effect instanceof AfterDamageEffect && effect.target.cards.includes(this)) {
      const player = effect.player;
      const targetPlayer = StateUtils.findOwner(state, effect.target);

      // Only works if this is the active Pokémon and was damaged by opponent
      if (effect.damage <= 0 || player === targetPlayer || targetPlayer.active !== effect.target) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, targetPlayer, this)) {
        return state;
      }

      // Only during attack phase
      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }

      // Discard energy from attacker
      const attacker = effect.source;
      const attackerEnergy = attacker.cards.filter(c => c.superType === SuperType.ENERGY);

      if (attackerEnergy.length === 0) {
        return state;
      }

      if (attackerEnergy.length === 1) {
        MOVE_CARDS(store, state, attacker, player.discard, { cards: [attackerEnergy[0]], sourceCard: this });
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        targetPlayer,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        attacker,
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        if (selected && selected.length > 0) {
          MOVE_CARDS(store, state, attacker, player.discard, { cards: [selected[0]], sourceCard: this });
        }
      });
    }

    // Absorb Life - heal 20
    if (WAS_ATTACK_USED(effect, 0, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect, store, state, 20);
    }

    return state;
  }
}

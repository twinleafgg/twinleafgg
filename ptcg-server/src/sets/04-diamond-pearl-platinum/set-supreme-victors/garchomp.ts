import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameMessage, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { IS_POKEBODY_BLOCKED, MOVE_CARDS, ON_DAMAGED_BY_OPPONENT_ATTACK_EVEN_IF_KNOCKED_OUT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Garchomp extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Gabite';
  public hp: number = 130;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C, value: +30 }];
  public retreat = [];

  public powers = [{
    name: 'Dragon Intimidation',
    powerType: PowerType.POKEBODY,
    text: 'If Garchomp is your Active Pokémon and is damaged by an opponent\'s attack (even if Garchomp is Knocked Out), choose an Energy card attached to the Attacking Pokémon and put it into your opponent\'s hand.'
  }];

  public attacks = [{
    name: 'Guard Claw',
    cost: [C, C],
    damage: 40,
    text: 'During your opponent\'s next turn, any damage done to Garchomp by attacks is reduced by 20 (after applying Weakness and Resistance).'
  }, {
    name: 'Speed Impact',
    cost: [C, C, C],
    damage: 120,
    damageCalculation: '-',
    text: 'Does 120 damage minus 20 damage for each Energy attached to the Defending Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Garchomp';
  public fullName: string = 'Garchomp SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Dragon Intimidation
    if (ON_DAMAGED_BY_OPPONENT_ATTACK_EVEN_IF_KNOCKED_OUT(state, effect, { source: this })) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      const attacking = effect.source;
      if (!attacking.cards.some(c => c.superType === SuperType.ENERGY)) {
        return state;
      }
      store.prompt(state, new ChooseCardsPrompt(
        owner,
        GameMessage.CHOOSE_ENERGIES_TO_HAND,
        attacking,
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        if (cards.length > 0) {
          const attackingOwner = StateUtils.findOwner(state, attacking);
          MOVE_CARDS(store, state, attacking, attackingOwner.hand, { cards, sourceCard: this });
        }
      });
    }

    // Guard Claw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return THIS_POKEMON_TAKES_LESS_DAMAGE_FROM_ATTACKS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, 20);
    }

    // Speed Impact
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const checkEnergy = new CheckProvidedEnergyEffect(effect.opponent, effect.opponent.active);
      store.reduceEffect(state, checkEnergy);
      effect.damage = Math.max(0, 120 - 20 * checkEnergy.energyMap.length);
    }

    return state;
  }
}

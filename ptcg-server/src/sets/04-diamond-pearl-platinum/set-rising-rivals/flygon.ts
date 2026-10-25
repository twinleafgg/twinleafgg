import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { EnergyCard, PlayerType, PokemonCardList, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckPokemonTypeEffect, CheckRetreatCostEffect } from '../../../game/store/effects/check-effects';
import { DISCARD_A_STADIUM_CARD_IN_PLAY } from '../../../game/store/prefabs/attack-effects';
import { PREVENT_DAMAGE, PREVENT_EFFECTS_OF_ATTACKS } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Flygon extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Vibrava';
  public hp: number = 120;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C, value: +30 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Rainbow Float',
    powerType: PowerType.POKEBODY,
    text: 'If any basic Energy card attached to Flygon is the same type as any of your Pokémon, the Retreat Cost for those Pokémon is 0.'
  }];

  public attacks = [{
    name: 'Sand Wall',
    cost: [C, C],
    damage: 40,
    text: 'Discard a Stadium card your opponent has in play. If you do, prevent all effects of an attack, including damage, done to Flygon during your opponent\'s next turn.'
  }, {
    name: 'Power Swing',
    cost: [C, C, C],
    damage: 60,
    damageCalculation: '+',
    text: 'Does 60 damage plus 10 more damage for each Evolved Pokémon on your Bench.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Flygon';
  public fullName: string = 'Flygon RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rainbow Float
    if (effect instanceof CheckRetreatCostEffect) {
      const player = effect.player;
      let flygonSlot: PokemonCardList | undefined;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard() === this) {
          flygonSlot = cardList;
        }
      });
      if (!flygonSlot || IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const energyTypes: CardType[] = [];
      flygonSlot.cards.forEach(card => {
        if (card instanceof EnergyCard && card.energyType === EnergyType.BASIC) {
          energyTypes.push(...card.provides);
        }
      });
      if (energyTypes.length === 0) {
        return state;
      }

      const checkType = new CheckPokemonTypeEffect(player.active);
      store.reduceEffect(state, checkType);
      if (checkType.cardTypes.some(t => energyTypes.includes(t))) {
        effect.cost = [];
      }
    }

    // Sand Wall
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (stadiumCard !== undefined) {
        const stadiumOwner = StateUtils.findOwner(state, StateUtils.findCardList(state, stadiumCard));
        if (stadiumOwner === effect.opponent) {
          DISCARD_A_STADIUM_CARD_IN_PLAY(state);
          PREVENT_DAMAGE(store, state, effect, this);
          PREVENT_EFFECTS_OF_ATTACKS(store, state, effect, this);
        }
      }
    }

    // Power Swing
    if (WAS_ATTACK_USED(effect, 1, this)) {
      let evolved = 0;
      effect.player.bench.forEach(bench => {
        if (bench.cards.length > 0 && bench.getPokemons().length > 1) {
          evolved += 1;
        }
      });
      effect.damage += 10 * evolved;
    }

    return state;
  }
}

import { CardType, PlayerType, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ADD_DAMAGE_FROM_ABILITY } from '../../../game/store/prefabs/effect-of-ability-prefabs';
import { IS_ABILITY_BLOCKED } from '../../../game/store/prefabs/prefabs';

export class Blastoise extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Wartortle';
  public hp: number = 170;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Torrential Pump',
    powerType: PowerType.ABILITY,
    text: 'Attacks used by your [W] Pokémon do 30 more damage to your opponent\'s Benched Pokémon (before applying Weakness and Resistance). This Ability\'s effect doesn\'t stack.'
  }];

  public attacks = [{
    name: 'Heavy Splash',
    cost: [W, W, W],
    damage: 140,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '16';
  public name: string = 'Blastoise';
  public fullName: string = 'Blastoise FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Torrential Pump
    if (effect instanceof PutDamageEffect) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const isBenchedTarget = opponent.bench.some(b => b === effect.target);
      if (!isBenchedTarget) {
        return state;
      }

      const checkPokemonType = new CheckPokemonTypeEffect(effect.source);
      store.reduceEffect(state, checkPokemonType);
      if (!checkPokemonType.cardTypes.includes(W)) {
        return state;
      }

      let blastoiseInPlay = false;
      let isFirstBlastoise = true;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card === this) {
          blastoiseInPlay = true;
        }
        if (
          card !== this &&
          card.name === 'Blastoise' &&
          card.powers.some(p => p.name === 'Torrential Pump') &&
          !IS_ABILITY_BLOCKED(store, state, player, card)
        ) {
          if (!blastoiseInPlay) {
            isFirstBlastoise = false;
          }
        }
      });

      if (!blastoiseInPlay || !isFirstBlastoise) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      ADD_DAMAGE_FROM_ABILITY(
        store,
        state,
        player,
        this.powers[0],
        this,
        effect,
        30,
      );
    }

    return state;
  }
}

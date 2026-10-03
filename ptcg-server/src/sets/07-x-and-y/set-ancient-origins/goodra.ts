import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, StoreLike, State, StateUtils } from '../../../game';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { THIS_POKEMON_CANNOT_BE_SPECIAL_CONDITIONED_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Goodra extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Sliggoo';
  public cardType: CardType[] = [N];
  public hp: number = 150;
  public weakness = [{ type: Y }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Liquid Blow',
    cost: [C, C],
    damage: 0,
    text: 'This attack does 20 damage to 1 of your opponent\'s Pokémon for each Colorless in its Retreat Cost. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  },
  {
    name: 'Shining Breath',
    cost: [W, Y, C, C],
    damage: 110,
    text: 'During your opponent\'s next turn, this Pokémon can\'t be affected by any Special Conditions.'
  }];

  public set: string = 'AOR';
  public setNumber: string = '60';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Goodra';
  public fullName: string = 'Goodra AOR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Liquid Blow
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), targets => {
        if (!targets || targets.length === 0) {
          return;
        }

        const target = targets[0];
        const opponent = StateUtils.getOpponent(state, player);

        // Get retreat cost of chosen target
        const pokemonCard = target.getPokemonCard();
        const retreatCost = pokemonCard ? pokemonCard.retreat.length : 0;
        const totalDamage = 20 * retreatCost;

        if (totalDamage > 0) {
          if (target === opponent.active) {
            const dealDamage = new DealDamageEffect(effect, totalDamage);
            dealDamage.target = target;
            store.reduceEffect(state, dealDamage);
          } else {
            const putDamage = new PutDamageEffect(effect, totalDamage);
            putDamage.target = target;
            store.reduceEffect(state, putDamage);
          }
        }
      });
    }
    // Shining Breath
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return THIS_POKEMON_CANNOT_BE_SPECIAL_CONDITIONED_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }

    return state;
  }
}

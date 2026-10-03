import { PokemonCardList, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_POKEMON_OFF_BOARD, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Jumpluff extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Skiploom';
  public cardType: CardType[] = [G];
  public hp: number = 90;
  public weakness = [{ type: R }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Cowardice',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may discard all cards attached to this Pokémon and return it to your hand. You can\'t use this Ability during your first turn or on the turn this Pokémon was put into play.'
  }];

  public attacks = [{
    name: 'Acrobatics',
    cost: [G],
    damage: 20,
    damageCalculation: '+',
    text: 'Flip 2 coins. This attack does 30 more damage for each heads.'
  }];

  public set: string = 'DRX';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '3';
  public name: string = 'Jumpluff';
  public fullName: string = 'Jumpluff DRX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);

      const pokemonCardList = cardList as PokemonCardList;
      if (!pokemonCardList.getPokemonCard()) {
        return state;
      }

      MOVE_POKEMON_OFF_BOARD(store, state, pokemonCardList, {
        pokemonDestination: player.hand,
        attachedDestination: player.discard,
        sourceCard: this,
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 2, results => {
        let heads: number = 0;
        results.forEach(r => {
          if (r) heads++;
        });
        effect.damage += 30 * heads;
      });
    }

    return state;
  }
}

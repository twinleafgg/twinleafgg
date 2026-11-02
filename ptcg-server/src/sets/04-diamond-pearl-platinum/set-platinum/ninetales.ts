import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { EnergyCard, PlayerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../../game/store/prefabs/attack-effects';
import { ATTACH_UP_TO_X_ENERGY_FROM_DECK_TO_Y_OF_YOUR_POKEMON, FLIP_UNTIL_TAILS_AND_COUNT_HEADS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Ninetales extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Vulpix';
  public hp: number = 90;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +20 }];
  public retreat = [];

  public attacks = [{
    name: 'Flame Bash',
    cost: [],
    damage: 0,
    text: 'Flip a coin until you get tails. Search your deck for a number of basic Fire Energy cards up to the number of heads and attach them to any of your Pokémon in any way you like. Shuffle your deck afterward.'
  }, {
    name: 'Mysterious Flames',
    cost: [R, C],
    damage: 40,
    text: 'If you have more Energy in play than your opponent, the Defending Pokémon is now Burned and Confused.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '36';
  public name: string = 'Ninetales';
  public fullName: string = 'Ninetales PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flame Bash
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return FLIP_UNTIL_TAILS_AND_COUNT_HEADS(store, state, player, heads => {
        if (heads > 0) {
          ATTACH_UP_TO_X_ENERGY_FROM_DECK_TO_Y_OF_YOUR_POKEMON(store, state, player, heads, 6, {
            energyFilter: { energyType: EnergyType.BASIC, name: 'Fire Energy' },
            min: 0,
            allowCancel: true,
          });
        }
      });
    }

    // Mysterious Flames
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      const countEnergy = (owner: typeof player) => {
        let count = 0;
        owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          count += cardList.cards.filter(card => card instanceof EnergyCard).length;
        });
        return count;
      };

      if (countEnergy(player) > countEnergy(opponent)) {
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
      }
    }

    return state;
  }
}

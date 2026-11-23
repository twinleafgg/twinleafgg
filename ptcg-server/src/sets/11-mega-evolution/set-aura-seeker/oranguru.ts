import { CardTag, CardType, PlayerType, PokemonCard, SlotType, Stage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Oranguru extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 120;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Slap Down',
    cost: [P],
    damage: 20,
    text: ''
  },
  {
    name: 'Sage\'s Command',
    cost: [C, C, C],
    damage: 60,
    damageCalculation: 'x',
    text: 'This attack does 60 damage for each Mega Evolution Pokémon ex on your Bench.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '33';
  public name: string = 'Oranguru';
  public fullName: string = 'Oranguru FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sage's Command
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      let megaExCount = 0;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (
          target.slot === SlotType.BENCH &&
          card.hasTag(CardTag.POKEMON_SV_MEGA) &&
          card.hasTag(CardTag.POKEMON_ex)
        ) {
          megaExCount++;
        }
      });

      effect.damage = 60 * megaExCount;
    }

    return state;
  }
}

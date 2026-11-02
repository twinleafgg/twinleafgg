import { PlayerType, PokemonCard, SlotType, State, StoreLike } from '../../../game';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { ADD_SLEEP_TO_PLAYER_ACTIVE, ATTACH_ENERGY_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Parasect extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Paras';
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Nutritional Support',
    cost: [C],
    damage: 0,
    text: 'Search your deck for up to 2 Grass Energy cards and attach them to any of your Pokémon in any way you like. Shuffle your deck afterward.'
  }, {
    name: 'Hibernation Spore',
    cost: [G, G, C],
    damage: 40,
    text: 'The Defending Pokémon is now Asleep. Flip 2 coins instead of 1 between turns. If either of them is tails, the Defending Pokémon is still Asleep.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '38';
  public name: string = 'Parasect';
  public fullName: string = 'Parasect SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Nutritional Support
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return ATTACH_ENERGY_PROMPT(
        store, state, effect.player,
        PlayerType.BOTTOM_PLAYER, SlotType.DECK,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { min: 0, max: 2, allowCancel: true, validCardTypes: [CardType.GRASS] }
      );
    }

    // Hibernation Spore
    if (WAS_ATTACK_USED(effect, 1, this)) {
      ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, effect.opponent, this, 2);
    }

    return state;
  }
}

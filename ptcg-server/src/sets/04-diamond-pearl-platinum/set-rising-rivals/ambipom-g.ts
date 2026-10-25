import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { CardTarget, PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { MOVE_AN_ENERGY_FROM_OPPONENTS_POKEMON_TO_ANOTHER } from '../../../game/store/prefabs/attack-effects';

export class AmbipomG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Tail Code',
    cost: [C],
    damage: 0,
    text: 'Move an Energy card attached to the Defending Pokémon to another of your opponent\'s Pokémon.'
  }, {
    name: 'Snap Attack',
    cost: [C, C],
    damage: 60,
    text: 'If the Defending Pokémon has any Energy cards attached to it, this attack\'s base damage is 20 instead of 60.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '56';
  public name: string = 'Ambipom G';
  public fullName: string = 'Ambipom G RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Tail Code
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];
      effect.opponent.forEachPokemon(PlayerType.TOP_PLAYER, (_list, _card, target) => {
        if (target.slot === SlotType.BENCH) {
          blockedFrom.push(target);
        }
        if (target.slot === SlotType.ACTIVE) {
          blockedTo.push(target);
        }
      });
      MOVE_AN_ENERGY_FROM_OPPONENTS_POKEMON_TO_ANOTHER(store, state, effect, {
        blockedFrom,
        blockedTo,
        min: 1,
        max: 1,
        allowCancel: false,
      });
    }

    // Snap Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.opponent.active.cards.some(c => c.superType === SuperType.ENERGY)) {
        effect.damage = 20;
      }
    }

    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { IS_POKEBODY_BLOCKED, THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Onix extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [F];
  public weakness = [{ type: G }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Energy Healer',
    powerType: PowerType.POKEBODY,
    text: 'Whenever you attach an Energy card from your hand to Onix, remove a damage counter from Onix.'
  }];

  public attacks = [{
    name: 'Boundless Power',
    cost: [F, C, C, C],
    damage: 80,
    text: 'Onix can\'t attack during your next turn.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '56';
  public name: string = 'Onix';
  public fullName: string = 'Onix UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energy Healer
    if (effect instanceof AttachEnergyEffect && effect.target.getPokemonCard() === this) {
      if (!IS_POKEBODY_BLOCKED(store, state, effect.player, this)) {
        store.reduceEffect(state, new HealEffect(effect.player, effect.target, 10));
      }
    }

    // Boundless Power
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(effect.player);
    }

    return state;
  }
}

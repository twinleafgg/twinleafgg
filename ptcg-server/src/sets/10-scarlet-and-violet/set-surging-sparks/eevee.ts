import { State, PowerType, CardType, PokemonCard, Stage, StoreLike } from '../../../game';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ADAPTIVE_EVOLUTION, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Eevee extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 50;

  public weakness = [{ type: CardType.FIGHTING }];

  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'Boosted Evolution',
    text: 'As long as this Pokémon is in the Active Spot, it can evolve during your first turn or the turn you play it.',
    powerType: PowerType.ABILITY
  }];

  public attacks = [{
    name: 'Reckless Charge',
    cost: [CardType.COLORLESS, CardType.COLORLESS],
    damage: 30,
    text: 'This Pokémon also does 10 damage to itself.'
  }];

  public regulationMark = 'H';

  public set: string = 'SSP';

  public name: string = 'Eevee';

  public fullName: string = 'Eevee SSP';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '143';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    state = ADAPTIVE_EVOLUTION(store, state, effect, this, { requireActive: true });

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const dealDamage = new DealDamageEffect(effect, 10);
      dealDamage.target = player.active;
      return store.reduceEffect(state, dealDamage);
    }

    return state;
  }
}

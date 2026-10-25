import { Card } from '../../../game';
import { CardType } from '../../../game';
import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Entei extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [{
    name: 'Flare Blitz',
    cost: [R, R, C],
    damage: 80,
    text: 'Discard all Fire Energy attached to Entei.'
  }];

  public set: string = 'HSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '20';
  public name: string = 'Entei';
  public fullName: string = 'Entei HSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flare Blitz
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);
      const cards: Card[] = checkProvidedEnergy.energyMap
        .filter(e => e.provides.includes(CardType.FIRE) || e.provides.includes(CardType.ANY))
        .map(e => e.card);
      const discardEnergy = new DiscardCardsEffect(effect, cards);
      discardEnergy.target = player.active;
      store.reduceEffect(state, discardEnergy);
    }

    return state;
  }
}

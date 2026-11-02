import { State, StoreLike } from '../../../game';
import { CardTag, CardType, EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';

export class SPEnergy extends EnergyCard {
  public provides: CardType[] = [C];
  public energyType = EnergyType.SPECIAL;
  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '101';
  public name: string = 'SP Energy';
  public fullName: string = 'SP Energy RR';
  public text: string = 'SP Energy provides Colorless Energy. If the Pokémon SP Energy is attached to is a Pokémon SP, SP Energy provides every type of Energy buy provides only 1 Energy at a time. (Doesn\'t count as a basic Energy card.)';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckProvidedEnergyEffect && effect.source.cards.includes(this)) {
      const attachedTo = effect.source.getPokemonCard();
      const provides = attachedTo?.hasTag(CardTag.POKEMON_SP) ? [CardType.ANY] : [C];
      effect.energyMap.push({ card: this, provides });
    }

    return state;
  }
}

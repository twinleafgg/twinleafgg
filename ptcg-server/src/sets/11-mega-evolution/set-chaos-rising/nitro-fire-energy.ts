import { CardType, EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { Effect } from '../../../game/store/effects/effect';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { StateUtils, StoreLike, State } from '../../../game';
import {IS_SPECIAL_ENERGY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class NitroFireEnergy extends EnergyCard {
  public provides: CardType[] = [CardType.FIRE];
  public energyType = EnergyType.SPECIAL;
  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '86';
  public name: string = 'Nitro Fire Energy';
  public fullName: string = 'Nitro Fire Energy M4';
  public text: string =
    'As long as this card is attached to a Pokémon, it provides [R] Energy.\n\n' +
    'If this card is discarded by an effect of an attack used by the [R] Pokémon this card is attached to, put this card into your hand after attack damage and effects.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof DiscardCardsEffect && effect.cards?.includes(this)) {
      try {
        const pokemon = effect.source;
        if (!pokemon?.energies?.cards?.includes(this)) return state;
        const owner = StateUtils.findOwner(state, pokemon);
        if (IS_SPECIAL_ENERGY_BLOCKED(store, state, owner, this, pokemon)) return state;
        const checkType = new CheckPokemonTypeEffect(pokemon);
        store.reduceEffect(state, checkType);
        if (checkType.cardTypes.includes(CardType.FIRE)) {
          effect.cards = effect.cards.filter((c) => c !== this);
          MOVE_CARDS(store, state, pokemon.energies, owner.hand, { cards: [this], sourceCard: this });
        }
      } catch {
        return state;
      }
    }
    return state;
  }
}

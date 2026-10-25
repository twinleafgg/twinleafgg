import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACH_ENERGY_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Mareep extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 40;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Static Electricity',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a number of Lightning Energy cards up to the number of Mareep in play (both yours and your opponent\'s) and attach them to Mareep. Shuffle your deck afterward.'
  },
  {
    name: 'Ram',
    cost: [C, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '73';
  public name: string = 'Mareep';
  public fullName: string = 'Mareep HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Static Electricity
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      if (player.deck.cards.length === 0) {
        return state;
      }

      let mareepCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemonCard()?.name === 'Mareep') {
          mareepCount += 1;
        }
      });
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        if (cardList.getPokemonCard()?.name === 'Mareep') {
          mareepCount += 1;
        }
      });

      if (mareepCount === 0) {
        return state;
      }

      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.DECK,
        [SlotType.ACTIVE],
        { energyType: EnergyType.BASIC, name: 'Lightning Energy' },
        { min: 0, max: mareepCount, allowCancel: false, sameTarget: true },
      );
    }

    return state;
  }
}

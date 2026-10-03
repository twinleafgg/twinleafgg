import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {HAS_CARD_IN_DISCARD, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Varoom extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Metal Coating',
    cost: [C],
    damage: 0,
    text: 'Attach a Basic [M] Energy card from your discard pile to this Pokémon.'
  },
  {
    name: 'Ram',
    cost: [M, C, C],
    damage: 50,
    text: ''
  }];

  public regulationMark = 'H';
  public set: string = 'TWM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '124';
  public name: string = 'Varoom';
  public fullName: string = 'Varoom TWM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Metal Coating
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (!HAS_CARD_IN_DISCARD(player, { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Metal Energy' })) {
        return state;
      }

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Metal Energy' },
        { min: 1, max: 1, allowCancel: false }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    return state;
  }
}

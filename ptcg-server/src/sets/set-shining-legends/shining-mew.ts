import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../game/store/card/card-types';
import { StoreLike, State, AttachEnergyPrompt, GameMessage, PlayerType, SlotType, StateUtils, ShuffleDeckPrompt } from '../../game';
import { Effect } from '../../game/store/effects/effect';

import {SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class ShiningMew extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.PSYCHIC];
  public hp: number = 30;
  public weakness = [{ type: CardType.DARK }];
  public retreat = [];

  public attacks = [{
    name: 'Legendary Guidance',
    cost: [CardType.PSYCHIC],
    damage: 0,
    text: 'Search your deck for up to 2 Energy cards and attach them to your Pokemon in any way you like. Then, shuffle your deck.'
  }, {
    name: 'Beam',
    cost: [CardType.PSYCHIC],
    damage: 10,
    text: ''
  }];

  public set: string = 'SLG';
  public name: string = 'Shining Mew';
  public fullName: string = 'Shining Mew SLG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '40';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.deck,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH, SlotType.ACTIVE],
        { superType: SuperType.ENERGY },
        { allowCancel: true, min: 0, max: 2 },
      ), transfers => {
        transfers = transfers || [];
        // cancelled by user
        if (transfers.length === 0) {
          SHUFFLE_DECK(store, state, player);
          return state;
        }
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
        }
        state = store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });

    }

    return state;
  }
}
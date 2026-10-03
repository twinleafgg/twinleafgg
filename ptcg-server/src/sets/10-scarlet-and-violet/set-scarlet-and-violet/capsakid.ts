import { PokemonCard, Stage, CardType, Resistance, StoreLike, State, GameMessage, SuperType, EnergyType, StateUtils, AttachEnergyPrompt, PlayerType, ShuffleDeckPrompt, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Capsakid extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.GRASS];
  public hp: number = 70;
  public weakness = [{ type: CardType.FIRE }];
  public resistance: Resistance[] = [];
  public retreat = [CardType.COLORLESS];

  public attacks = [
    {
      name: 'Increasing Spice',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: 'Search your deck for a Basic [R] Energy card and attach it to this Pokémon. Then, shuffle your deck.'
    },
    {
      name: 'Playful Kick',
      cost: [CardType.GRASS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 50,
      text: ''
    }
  ];

  public regulationMark = 'G';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '28';
  public set = 'SVI';
  public name: string = 'Capsakid';
  public fullName: string = 'Capsakid SVI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.deck,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
        { allowCancel: false, min: 0, max: 1 },
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
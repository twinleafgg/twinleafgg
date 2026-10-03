import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { State, StateUtils, StoreLike, DiscardEnergyPrompt, GameMessage, PlayerType, SlotType } from '../../../game';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TapuKoko extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 120;
  public weakness = [{ type: F }];
  public resistance = [];
  public retreat = [C];

  public attacks = [{
    name: 'Fast Flight',
    cost: [L],
    damage: 0,
    canUseOnFirstTurn: true,
    text: 'If you go first, you can use this attack during your first turn. Discard your hand and draw 5 cards.'
  },
  {
    name: 'Thunder Blast',
    cost: [L, L, C],
    damage: 130,
    text: 'Discard 2 Energy from this Pokémon.'
  }];

  public regulationMark = 'I';
  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '67';
  public name: string = 'Tapu Koko';
  public fullName: string = 'Tapu Koko M2a';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Fast Flight
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Discard all cards from hand
      const cards = player.hand.cards;
      MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

      // Draw 5 cards
      if (player.deck.cards.length > 0) {
        MOVE_CARDS(store, state, player.deck, player.hand, { count: 5, sourceCard: this });
      }
    }

    // Thunder Blast
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      // Check if this Pokémon has at least 2 energy attached
      const energyCount = player.active.cards.filter(card =>
        card.superType === SuperType.ENERGY
      ).length;

      if (energyCount >= 2) {
        state = store.prompt(state, new DiscardEnergyPrompt(
          player.id,
          GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 2, max: 2 }
        ), transfers => {
          transfers = transfers || [];
          if (transfers.length === 0) {
            return state;
          }
          for (const transfer of transfers) {
            const source = StateUtils.getTarget(state, player, transfer.from);
            MOVE_CARDS(store, state, source, player.discard, { cards: [transfer.card], sourceCard: this });
          }
        });
      }
    }

    return state;
  }
}

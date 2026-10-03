import { CardType, Stage, SpecialCondition, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { State, StateUtils, StoreLike, DiscardEnergyPrompt, GameMessage, PlayerType, SlotType } from '../../../game';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Camerupt extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Numel';
  public cardType: CardType[] = [R];
  public hp: number = 140;
  public weakness = [{ type: W }];
  public resistance = [];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Roasting Burn',
    cost: [R],
    damage: 110,
    text: 'If your opponent\'s Active Pokémon isn\'t Burned, this attack does nothing.'
  },
  {
    name: 'Power Stomp',
    cost: [R, C, C, C],
    damage: 170,
    text: 'Discard 2 Energy from this Pokémon.'
  }];

  public regulationMark = 'I';
  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '28';
  public name: string = 'Camerupt';
  public fullName: string = 'Camerupt M2a';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Burn Roast
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const activePokemon = opponent.active;

      // Check if opponent's active Pokémon is not burned
      if (!activePokemon.specialConditions.includes(SpecialCondition.BURNED)) {
        effect.damage = 0;
      }
    }

    // Power Stomp
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
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, EnergyCard, PlayerType, SlotType, CardTarget } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { AttachEnergyPrompt } from '../../../game/store/prompts/attach-energy-prompt';

export class Pikachu extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 60;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Energize',
      cost: [C],
      damage: 0,
      text: 'Search your discard pile for a [L] Energy card and attach it to this Pokémon.'
    },
    {
      name: 'Thunderbolt',
      cost: [L, L, C],
      damage: 80,
      text: 'Discard all Energy attached to this Pokémon.'
    }
  ];

  public set: string = 'BLW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '115';
  public name: string = 'Pikachu';
  public fullName: string = 'Pikachu BLW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Energize - Search discard for Lightning Energy, attach to self
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const hasLightningEnergyInDiscard = player.discard.cards.some(c =>
        c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC && (c as EnergyCard).provides.includes(CardType.LIGHTNING)
      );

      if (!hasLightningEnergyInDiscard) {
        return state;
      }

      // Block attaching to anywhere except active
      const blockedTo: CardTarget[] = [];
      player.bench.forEach((_, index) => {
        blockedTo.push({
          player: PlayerType.BOTTOM_PLAYER,
          slot: SlotType.BENCH,
          index
        });
      });

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_ACTIVE,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
        { allowCancel: true, min: 0, max: 1, blockedTo }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    // Thunderbolt - Discard ALL Energy from self
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const allEnergies = player.active.cards.filter(c => c.superType === SuperType.ENERGY);

      if (allEnergies.length > 0) {
        const discardEnergy = new DiscardCardsEffect(effect, allEnergies);
        discardEnergy.target = player.active;
        store.reduceEffect(state, discardEnergy);
      }
    }

    return state;
  }
}

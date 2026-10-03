import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  SuperType,
  CardTag,
  EnergyType,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  GameMessage,
  PlayerType,
  SlotType,
  AttachEnergyPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class SolgaleoPrismStar extends PokemonCard {
  protected _tags = [CardTag.PRISM_STAR];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [M];
  public hp: number = 160;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Radiant Star',
      cost: [M],
      damage: 0,
      text: "For each of your opponent's Pokémon in play, attach a [M] Energy card from your discard pile to your Pokémon in any way you like.",
    },
    {
      name: 'Corona Impact',
      cost: [M, M, M, M],
      damage: 160,
      text: "This Pokémon can't attack during your next turn.",
    },
  ];

  public set: string = 'UPR';
  public setNumber: string = '89';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Solgaleo Prism Star';
  public fullName: string = 'Solgaleo Prism Star FLI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Radiant Star
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return (
          c.superType === SuperType.ENERGY &&
          c.energyType === EnergyType.BASIC &&
          c.name === 'Metal Energy'
        );
      });
      if (!hasEnergyInDiscard) {
        return state;
      }

      const benched = opponent.bench.reduce((left, b) => left + (b.cards.length ? 1 : 0), 0);
      if (benched === 0) {
        return state;
      }

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: false, min: 0, max: benched },
        ),
        (transfers) => {
          transfers = transfers || [];
          if (transfers.length === 0) {
            return;
          }
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    // Corona Impact
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      player.active.cannotAttackNextTurnPending = true;
    }

    return state;
  }
}

import { CardTag, CardType, Stage, SpecialCondition } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import {
  PokemonCard,
  StateUtils,
  GameMessage,
  DiscardEnergyPrompt,
  PlayerType,
  SlotType,
  SuperType,
} from '../../../game';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MegaCameruptEx extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Numel';
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public hp: number = 340;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C, C, C, C];

  public attacks = [
    {
      name: 'Roasting Heat',
      cost: [R],
      damage: 80,
      damageCalculation: '+',
      text: "If your opponent's Active Pokémon is Burned, this attack does 160 more damage.",
    },
    {
      name: 'Volcano Meteor',
      cost: [R, C, C, C],
      damage: 280,
      text: 'Discard 2 Energy from this Pokémon.',
    },
  ];

  public regulationMark: string = 'I';
  public set: string = 'MEG';
  public setNumber: string = '22';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mega Camerupt ex';
  public fullName: string = 'Mega Camerupt ex M1L';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Roasting Heat
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const activePokemon = opponent.active;

      // Check if opponent's active Pokémon is burned
      if (activePokemon.specialConditions.includes(SpecialCondition.BURNED)) {
        effect.damage += 160;
      }
    }

    // Volcano Meteor
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      // Check if this Pokémon has at least 2 energy attached
      const energyCount = player.active.cards.filter(
        (card) => card.superType === SuperType.ENERGY,
      ).length;

      if (energyCount >= 2) {
        state = store.prompt(
          state,
          new DiscardEnergyPrompt(
            player.id,
            GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.ACTIVE],
            { superType: SuperType.ENERGY },
            { allowCancel: false, min: 2, max: 2 },
          ),
          (transfers) => {
            transfers = transfers || [];
            if (transfers.length === 0) {
              return state;
            }
            for (const transfer of transfers) {
              const source = StateUtils.getTarget(state, player, transfer.from);
              MOVE_CARDS(store, state, source, player.discard, { cards: [transfer.card], sourceCard: this });
            }
          },
        );
      }
    }

    return state;
  }
}

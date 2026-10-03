import {
  PokemonCard,
  Stage,
  CardTag,
  CardType,
  StoreLike,
  State,
  EnergyCard,
  EnergyType,
  GameError,
  GameMessage,
  AttachEnergyPrompt,
  PlayerType,
  SlotType,
  SuperType,
  StateUtils,
  DiscardEnergyPrompt,
  SpecialCondition,
} from '../../../game';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Regiceex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [W];
  public hp: number = 230;
  public weakness = [{ type: L }];
  public resistance = [];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Regi Charge',
      cost: [C],
      damage: 0,
      text: 'Attach up to 2 Basic [W] Energy cards from your discard pile to this Pokémon.',
    },
    {
      name: 'Ice Prison',
      cost: [W, C, C, C],
      damage: 140,
      text: "Discard 2 Energy from this Pokémon, and your opponent's Active Pokémon is now Paralyzed.",
    },
  ];

  public regulationMark: string = 'I';
  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '48';
  public name: string = 'Regice ex';
  public fullName: string = 'Regice ex MC';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Regi Charge attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return (
          c.superType === SuperType.ENERGY &&
          (c as EnergyCard).energyType === EnergyType.BASIC &&
          (c as EnergyCard).provides &&
          (c as EnergyCard).provides.includes(CardType.WATER)
        );
      });
      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_ACTIVE,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Water Energy' },
          { allowCancel: false, min: 1, max: 2 },
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

      return state;
    }

    // Ice Prison attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Discard 2 Energy
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

      // Apply Paralyzed
      const specialConditionEffect = new AddSpecialConditionsEffect(effect, [
        SpecialCondition.PARALYZED,
      ]);
      specialConditionEffect.target = opponent.active;
      return store.reduceEffect(state, specialConditionEffect);
    }

    return state;
  }
}

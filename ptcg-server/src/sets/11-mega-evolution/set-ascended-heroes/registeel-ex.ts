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
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Registeelex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [M];
  public hp: number = 230;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Regi Charge',
      cost: [C],
      damage: 0,
      text: 'Attach up to 2 Basic [M] Energy cards from your discard pile to this Pokémon.',
    },
    {
      name: 'Protecting Steel',
      cost: [M, C, C, C],
      damage: 140,
      text: "During your opponent's next turn, this Pokemon takes 50 less damage from attacks (after applying Weakness and Resistance).",
    },
  ];

  public regulationMark: string = 'I';
  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '145';
  public name: string = 'Registeel ex';
  public fullName: string = 'Registeel ex MC';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Regicharge attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return (
          c.superType === SuperType.ENERGY &&
          (c as EnergyCard).energyType === EnergyType.BASIC &&
          (c as EnergyCard).provides &&
          (c as EnergyCard).provides.includes(CardType.METAL)
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
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Metal Energy' },
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

    // Protect Steel attack - reduce damage next turn
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      player.active.damageReductionNextTurn = 50;
    }

    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  EnergyType,
  SuperType,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  PowerType,
  StateUtils,
  PlayerType,
  AttachEnergyPrompt,
  EnergyCard,
  GameError,
  GameMessage,
  SlotType,
  CardTarget,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {ADD_MARKER,
  HAS_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { AttackEffect, KnockOutEffect } from '../../../game/store/effects/game-effects';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';

export class Latiasex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.DELTA_SPECIES, CardTag.POKEMON_ex];
  public cardType: CardType[] = [R];
  public hp: number = 100;
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Fellow Boost',
      useWhenInPlay: true,
      powerType: PowerType.POKEPOWER,
      text: "Once during your turn (before your attack), you may attach a basic Energy card from your hand to your Latias, Latias ex, Latios, or Latios ex. If you do, your turn ends. This power can't be used if Latias ex is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Power Crush',
      cost: [R, R, C],
      damage: 90,
      text: 'If the Defending Pokémon is Knocked Out by this attack, discard 2 [R] Energy attached to Latias ex.',
    },
  ];

  public set: string = 'DF';
  public setNumber: string = '95';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Latias ex';
  public fullName: string = 'Latias ex DF';

  public readonly POWER_CRUSH_MARKER = 'POWER_CRUSH_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (
        !player.hand.cards.some(
          (card) => card instanceof EnergyCard && card.energyType === EnergyType.BASIC,
        )
      ) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (
          card.name !== 'Latias' &&
          card.name !== 'Latias ex' &&
          card.name !== 'Latios' &&
          card.name !== 'Latios ex'
        ) {
          blockedTo.push(target);
        }
      });

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.hand,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: false, min: 1, max: 1, blockedTo },
        ),
        (transfers) => {
          transfers = transfers || [];
          // cancelled by user
          if (transfers.length === 0) {
            return;
          }

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });
          }

          const endTurnEffect = new EndTurnEffect(player);
          store.reduceEffect(state, endTurnEffect);
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      ADD_MARKER(this.POWER_CRUSH_MARKER, effect.opponent.active, this);
    }

    if (
      effect instanceof KnockOutEffect &&
      HAS_MARKER(this.POWER_CRUSH_MARKER, effect.target, this)
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const attackEffect = new AttackEffect(opponent, player, this.attacks[0]);
      attackEffect.preventDefault = true;
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, attackEffect, 2, CardType.FIRE);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.POWER_CRUSH_MARKER, this);

    return state;
  }
}

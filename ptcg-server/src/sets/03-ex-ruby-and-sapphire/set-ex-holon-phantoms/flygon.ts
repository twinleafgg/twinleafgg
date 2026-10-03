import { CardType, AttachEnergyPrompt,
  CardTag,
  CardTarget,
  EnergyType,
  GameError,
  GameMessage,
  PlayerType,
  PokemonCard,
  PowerType,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType, } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS } from '../../../game/store/prefabs/attack-effects';
import {ABILITY_USED,
  ADD_MARKER,
  BLOCK_IF_HAS_SPECIAL_CONDITION,
  HAS_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Flygon extends PokemonCard {
  public cardType: CardType[] = [G, M];
  public stage = Stage.BASIC;
  public evolvesFrom = 'Vibrava';
  protected _tags = [CardTag.DELTA_SPECIES];
  public hp = 110;
  public weakness = [{ type: C }];
  public resistance = [
    { type: L, value: -30 },
    { type: F, value: -30 },
  ];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Delta Supply',
      useWhenInPlay: true,
      powerType: PowerType.POKEPOWER,
      text: "Once during your turn (before your attack), you may attach a basic Energy card or a Delta Rainbow Energy card from your hand to 1 of your Pokémon that has Delta on its card. This power can't be used if Flygon is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Swift',
      cost: [G, M, C],
      damage: 60,
      shredAttack: true,
      text: "This attack's damage isn't affected by Weakness, Resistance, Poké-Powers, Poké-Bodies, or any other effects on the Defending Pokémon.",
    },
  ];

  public set = 'HP';
  public setNumber = '7';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Flygon';
  public fullName = 'Flygon HP';

  public readonly DELTA_SUPPLY_MARKER = 'DELTA_SUPPLY_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.DELTA_SUPPLY_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEnergyInHand = player.hand.cards.some((c) => {
        return (
          c.superType === SuperType.ENERGY &&
          (c.energyType === EnergyType.BASIC || c.name === 'Delta Rainbow Energy')
        );
      });

      if (HAS_MARKER(this.DELTA_SUPPLY_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const blocked: number[] = [];
      player.hand.cards.forEach((card, index) => {
        if (
          !(
            card.superType === SuperType.ENERGY &&
            (card.energyType === EnergyType.BASIC || card.name === 'Delta Rainbow Energy')
          )
        ) {
          blocked.push(index);
        }
      });

      const blocked2: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (!card.hasTag(CardTag.DELTA_SPECIES)) {
          blocked2.push(target);
        }
      });

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.hand,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 1, max: 1, blocked, blockedTo: blocked2 },
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
        },
      );

      ADD_MARKER(this.DELTA_SUPPLY_MARKER, player, this);
      ABILITY_USED(player, this);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACKS_DAMAGE_ISNT_AFFECTED_BY_EFFECTS(store, state, effect, 60);
    }

    return state;
  }
}

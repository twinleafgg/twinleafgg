import {
  CardTarget,
  GameError,
  GameMessage,
  MoveEnergyPrompt,
  PlayerType,
  PowerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import {ABILITY_USED,
  ADD_MARKER,
  BLOCK_IF_HAS_SPECIAL_CONDITION,
  HAS_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TeamMagmasClaydol extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = "Team Magma's Baltoy";
  protected _tags = [CardTag.TEAM_MAGMA];
  public cardType: CardType[] = [P, D];
  public hp: number = 80;
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Magma Switch',
      powerType: PowerType.POKEPOWER,
      useWhenInPlay: true,
      text: "Once during your turn (before your attack), you may move an Energy card attached to your Pokémon with Team Magma in its name to another of your Pokémon. This power can't be used if Team Magma's Claydol is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Dark Hand',
      cost: [P, C, C],
      damage: 40,
      damageCalculation: '+',
      text: 'If you have more cards in your hand than your opponent, this attack does 40 damage plus 20 more damage.',
    },
  ];

  public set: string = 'MA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '8';
  public name: string = "Team Magma's Claydol";
  public fullName: string = "Team Magma's Claydol MA";

  public readonly MAGMA_SWITCH_MARKER = 'MAGMA_SWITCH_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      if (HAS_MARKER(this.MAGMA_SWITCH_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      ABILITY_USED(player, this);
      ADD_MARKER(this.MAGMA_SWITCH_MARKER, player, this);

      const blockedFrom: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (!cardList.getPokemonCard()?.hasTag(CardTag.TEAM_MAGMA)) {
          blockedFrom.push(target);
        }
      });

      // No blockedMap needed, since all energy cards are allowed to be moved
      store.prompt(
        state,
        new MoveEnergyPrompt(
          effect.player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { min: 0, max: 1, allowCancel: true, blockedMap: [], blockedFrom },
        ),
        (transfers) => {
          if (transfers === null) {
            return;
          }

          for (const transfer of transfers) {
            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.MAGMA_SWITCH_MARKER, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.player.hand.cards.length > effect.opponent.hand.cards.length) {
        effect.damage += 20;
      }
    }

    return state;
  }
}

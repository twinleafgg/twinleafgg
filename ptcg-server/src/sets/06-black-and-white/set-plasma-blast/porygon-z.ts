import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  CardTarget,
  GameError,
  GameMessage,
  MoveEnergyPrompt,
  PlayerType,
  PowerType,
  SlotType,
  StoreLike,
  State,
  StateUtils,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {IS_ABILITY_BLOCKED,
  MULTIPLE_COIN_FLIPS_PROMPT,
  WAS_ATTACK_USED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PlasmaEnergy } from '../set-plasma-storm/plasma-energy';

export class PorygonZ extends PokemonCard {
  protected _tags = [CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Porygon2';
  public cardType: CardType[] = [C];
  public hp: number = 130;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [
    {
      name: 'Plasma Transfer',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'As often as you like during your turn (before your attack), you may move a Plasma Energy attached to 1 of your Pokémon to another of your Pokémon.',
    },
  ];

  public attacks = [{
    name: 'Tri Attack',
    cost: [C, C, C],
    damage: 50,
    damageCalculation: 'x',
    text: 'Flip 3 coins. This attack does 50 damage times the number of heads.'
  }];

  public set: string = 'PLB';
  public setNumber: string = '74';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Porygon-Z';
  public fullName: string = 'Porygon-Z PLB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ability: Plasma Transfer - move Plasma Energy between your Pokemon
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      // Build blocked map - only allow moving Plasma Energy cards
      const blockedMap: { source: CardTarget; blocked: number[] }[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        const blocked: number[] = [];

        cardList.cards.forEach((c, index) => {
          if (!(c instanceof PlasmaEnergy)) {
            blocked.push(index);
          }
        });

        if (blocked.length !== cardList.cards.length) {
          blockedMap.push({ source: target, blocked });
        }
      });

      return store.prompt(
        state,
        new MoveEnergyPrompt(
          effect.player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          {},
          { allowCancel: true, blockedMap },
        ),
        (transfers) => {
          if (transfers === null) {
            return;
          }

          for (const transfer of transfers) {
            if (
              transfer.from.player === transfer.to.player &&
              transfer.from.slot === transfer.to.slot &&
              transfer.from.index === transfer.to.index
            ) {
              continue;
            }

            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    // Attack: Tri Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, (results) => {
        const heads = results.filter((r) => r).length;
        effect.damage = 50 * heads;
      });
    }

    return state;
  }
}

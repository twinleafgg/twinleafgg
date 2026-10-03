import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt, GameError, GameMessage, PowerType, PlayerType, SlotType, StoreLike, State, StateUtils, EnergyCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_POWER_USED, IS_ABILITY_BLOCKED, USE_ABILITY_ONCE_PER_TURN, ABILITY_USED, REMOVE_MARKER_AT_END_OF_TURN, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Tsareena extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Steenee';
  public cardType: CardType[] = [G];
  public hp: number = 140;
  public weakness = [{ type: R }];
  public retreat = [C, C];

  public readonly QUEENLY_REWARD_MARKER = 'TSAREENA_UNM_QUEENLY_REWARD_MARKER';

  public powers = [{
    name: 'Queenly Reward',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may attach a [G] Energy card from your discard pile to your Active Pokémon.'
  }];

  public attacks = [
    {
      name: 'High Jump Kick',
      cost: [G, C, C],
      damage: 90,
      text: ''
    }
  ];

  public set: string = 'UNM';
  public setNumber: string = '19';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Tsareena';
  public fullName: string = 'Tsareena UNM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ability: Queenly Reward
    // Ref: set-phantom-forces/hydreigon.ts (Dark Impulse - attach energy from discard to active)
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      const hasEnergyInDiscard = player.discard.cards.some(c =>
        c instanceof EnergyCard && c.name === 'Grass Energy'
      );

      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.QUEENLY_REWARD_MARKER, this);
      ABILITY_USED(player, this);

      state = store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_ACTIVE,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE],
        { superType: SuperType.ENERGY, name: 'Grass Energy' },
        { allowCancel: false, min: 1, max: 1 }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.QUEENLY_REWARD_MARKER, this);

    return state;
  }
}

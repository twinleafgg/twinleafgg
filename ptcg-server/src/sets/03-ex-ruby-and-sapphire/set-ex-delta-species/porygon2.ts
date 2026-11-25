import { GameError, GameMessage, PowerType, State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import {
  ABILITY_USED,
  ADD_BURN_TO_PLAYER_ACTIVE,
  ADD_MARKER,
  ADD_SLEEP_TO_PLAYER_ACTIVE,
  AFTER_ATTACK,
  BLOCK_IF_HAS_SPECIAL_CONDITION,
  DRAW_CARDS_UNTIL_CARDS_IN_HAND,
  HAS_MARKER,
  REMOVE_MARKER_AT_END_OF_TURN,
  WAS_POWER_USED,
} from '../../../game/store/prefabs/prefabs';

export class Porygon2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Porygon';
  public cardType: CardType[] = [C];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [
    {
      name: 'Backup',
      useWhenInPlay: true,
      powerType: PowerType.POKEPOWER,
      text: "Once during your turn (before your attack), if you have less than 6 cards in your hand, you may draw cards until you have 6 cards in your hand. This power can't be used if Porygon2 is affected by a Special Condition.",
    },
  ];

  public attacks = [
    {
      name: 'Machine Burst',
      cost: [C, C],
      damage: 30,
      text: 'If Porygon2 has a Technical Machine card attached to it, the Defending Pokémon is now Asleep and Burned.',
    },
  ];

  public set: string = 'DS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '25';
  public name: string = 'Porygon2';
  public fullName: string = 'Porygon2 DS';

  public readonly BACKUP_MARKER = 'BACKUP_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.BACKUP_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      //Once per turn
      if (HAS_MARKER(this.BACKUP_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, 6);

      ADD_MARKER(this.BACKUP_MARKER, player, this);
      ABILITY_USED(player, this);
    }

    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;

      if (
        player.active.cards.some(
          (c) => c.superType === SuperType.TRAINER && c.hasTag(CardTag.RETRO_TM),
        )
      ) {
        ADD_BURN_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
        ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
      }
    }

    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { PokemonCardList, StateUtils } from '../../../game';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import {
  CAN_APPLY_LOCKER_ABILITY,
  HANDLE_ABILITY_LOCK,
  IS_ABILITY_LOCKER_IN_PLAY,
} from '../../../game/store/prefabs/ability-lock';
import { GameMessage } from '../../../game/game-message';

export class Spiritomb extends PokemonCard {
  public regulationMark = 'G';

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 60;

  public weakness = [{ type: CardType.DARK }];

  public resistance = [{ type: CardType.FIGHTING, value: -30 }];

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Fettered in Misfortune',
      powerType: PowerType.ABILITY,
      text: "Basic Pokémon V in play (both yours and your opponent's) have " + 'no Abilities. ',
    },
  ];

  public attacks = [
    {
      name: 'Fade Out',
      cost: [CardType.COLORLESS],
      damage: 10,
      text: 'Put this Pokémon and all attached cards into your hand. ',
    },
  ];

  public set: string = 'PAL';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '89';

  public name: string = 'Spiritomb';

  public fullName: string = 'Spiritomb PAL';

  private static readonly RULE_BOX_V_TAGS = [
    CardTag.POKEMON_V,
    CardTag.POKEMON_VSTAR,
    CardTag.POKEMON_VMAX,
  ];

  private isBasicPokemonV(card: PokemonCard): boolean {
    return card.stage === Stage.BASIC && Spiritomb.RULE_BOX_V_TAGS.some((tag) => card.hasTag(tag));
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    HANDLE_ABILITY_LOCK(
      effect,
      ({ player, card, power }) => {
        if (!IS_ABILITY_LOCKER_IN_PLAY(state, player, this)) {
          return false;
        }

        const targetCardList = StateUtils.findCardList(state, card);
        if (!(targetCardList instanceof PokemonCardList)) {
          return false;
        }

        if (!this.isBasicPokemonV(card)) {
          return false;
        }

        if (power?.exemptFromInitialize) {
          return false;
        }

        const lockerOwner = StateUtils.findOwner(state, StateUtils.findCardList(state, this));
        // Check + PowerEffect: Fettered in Misfortune must itself be usable (e.g. Path to the Peak).
        return CAN_APPLY_LOCKER_ABILITY(store, state, lockerOwner, this, this.powers[0]);
      },
      {
        allowUseFromHand: true,
        allowUseFromDiscard: true,
        error: GameMessage.BLOCKED_BY_ABILITY,
      },
    );

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      player.active.clearEffects();
      MOVE_CARDS(store, state, player.active, player.hand, { sourceCard: this });
    }
    return state;
  }
}

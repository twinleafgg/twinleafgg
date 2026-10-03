import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  GameError,
  GameMessage,
  PlayerType,
  PowerType,
  SlotType,
  StoreLike,
  State,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {ABILITY_USED,
  IS_ABILITY_BLOCKED,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';

export class Masquerain extends PokemonCard {
  protected _tags = [CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Surskit';
  public cardType: CardType[] = [G];
  public hp: number = 80;
  public weakness = [{ type: R }];
  public retreat = [C];

  public powers = [
    {
      name: 'Tool Reversal',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'As often as you like during your turn (before your attack), you may put a Pokémon Tool card attached to 1 of your Pokémon into your hand.',
    },
  ];

  public attacks = [
    {
      name: 'Bug Bite',
      cost: [C, C, C],
      damage: 60,
      text: '',
    },
  ];

  public set: string = 'PLB';
  public setNumber: string = '2';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Masquerain';
  public fullName: string = 'Masquerain PLB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      // Check if any of your Pokemon have a tool attached
      let hasToolAttached = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        if (cardList.tools.length > 0) {
          hasToolAttached = true;
        }
      });

      if (!hasToolAttached) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      ABILITY_USED(player, this);

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 1, allowCancel: true },
        ),
        (targets) => {
          if (!targets || targets.length === 0) {
            return;
          }
          const target = targets[0];
          if (target.tools.length > 0) {
            const tool = target.tools[0];
            MOVE_CARDS(store, state, target, player.hand, { cards: [tool], sourceCard: this });
          }
        },
      );
    }

    return state;
  }
}

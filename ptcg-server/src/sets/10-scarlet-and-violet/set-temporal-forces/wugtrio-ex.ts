import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameMessage,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  PlayerType,
  SlotType,
} from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import {DAMAGE_OPPONENT_POKEMON, TERA_RULE, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { BLOCK_RETREAT } from '../../../game/store/prefabs/effect-of-attack-prefabs';
export class Wugtrioex extends PokemonCard {
  protected _tags = [CardTag.POKEMON_ex, CardTag.POKEMON_TERA];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Wiglett';
  public cardType: CardType[] = [L];
  public hp: number = 250;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Tricolor Pump',
      cost: [W],
      damage: 0,
      text: "Discard up to 3 Energy cards from your hand. This attack does 60 damage to 1 of your opponent's Pokémon for each Energy card you discarded in this way. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
    {
      name: 'Numbing Hold',
      cost: [W, W],
      damage: 120,
      text: "During your opponent's next turn, the Defending Pokémon can't retreat.",
    },
  ];

  public set: string = 'TEF';
  public name: string = 'Wugtrio ex';
  public fullName: string = 'Wugtrio ex TEF';
  public regulationMark = 'H';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '60';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Tricolor Pump
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let watersCount = 0;

      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 0, max: 3 },
        ),
        (cards) => {
          cards = cards || [];
          watersCount = cards.length;
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
        },
      );

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { allowCancel: false },
        ),
        (selected) => {
          const targets = selected || [];
          DAMAGE_OPPONENT_POKEMON(store, state, effect, 60 * watersCount, targets);
        },
      );
    }

    // Numbing Hold
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return BLOCK_RETREAT(store, state, effect, this);
    }
    TERA_RULE(effect, state, this);

    return state;
  }
}

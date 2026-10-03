import {
  ChooseCardsPrompt,
  GameError,
  GameMessage,
  State,
  StoreLike,
} from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import {
  KNOCK_OUT_DEFENDING_POKEMON_AT_END_OF_OPPONENTS_NEXT_TURN,
} from '../../../game/store/prefabs/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HisuianZoroark extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Hisuian Zorua';
  public cardType: CardType[] = [P];
  public hp: number = 120;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Doom Curse',
    cost: [],
    damage: 0,
    text: "At the end of your opponent's next turn, the Defending Pokémon will be Knocked Out.",
  },
  {
    name: 'Call Back',
    cost: [P],
    damage: 0,
    text: 'Put a card from your discard pile into your hand.',
  }];

  public regulationMark = 'F';
  public set: string = 'LOR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '76';
  public name: string = 'Hisuian Zoroark';
  public fullName: string = 'Hisuian Zoroark LOR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      KNOCK_OUT_DEFENDING_POKEMON_AT_END_OF_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      if (player.discard.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      return store.prompt(
        state,
        [
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.discard,
            {},
            { min: 1, max: 1, allowCancel: false },
          ),
        ],
        (selected) => {
          const cards = selected || [];
          MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this });
        },
      );
    }
    return state;
  }
}

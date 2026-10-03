import {ADD_CONFUSION_TO_PLAYER_ACTIVE,
  AFTER_ATTACK,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { PlayerType, State, StoreLike } from '../../../game';
export class Chatot extends PokemonCard {
  protected _tags = [CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 60;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Misinformation',
      cost: [C],
      damage: 0,
      text: "Discard all Pok\u00e9mon Tool cards attached to each of your opponent's Pok\u00e9mon.",
    },
    {
      name: 'Tone-Deaf',
      cost: [C, C],
      damage: 20,
      text: 'The Defending Pok\u00e9mon is now Confused.',
    },
  ];

  public set: string = 'PLB';
  public setNumber: string = '77';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Chatot';
  public fullName: string = 'Chatot PLB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
        const tools = cardList.tools.slice();
        tools.forEach((tool) => {
          MOVE_CARDS(store, state, cardList, opponent.discard, { cards: [tool], sourceCard: this });
        });
      });
    }

    if (AFTER_ATTACK(effect, 1, this)) {
      ADD_CONFUSION_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
    }

    return state;
  }
}

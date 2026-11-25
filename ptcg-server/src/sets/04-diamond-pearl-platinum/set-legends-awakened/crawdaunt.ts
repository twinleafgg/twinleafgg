import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCardList, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {
  COIN_FLIP_PROMPT,
  MOVE_POKEMON_OFF_BOARD,
  WAS_ATTACK_USED,
} from '../../../game/store/prefabs/prefabs';

export class Crawdaunt extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Corphish';
  public hp: number = 90;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +20 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Gripthrow',
      cost: [W, C],
      damage: 0,
      text: 'Flip a coin. If heads, your opponent returns the Defending Pokémon and all cards attached to it to his or her hand.',
    },
    {
      name: 'Prop-up Pinchers',
      cost: [W, C, C],
      damage: 50,
      damageCalculation: '+',
      text: 'If Crawdaunt has a Technical Machine card attached to it, this attack does 50 damage plus 30 more damage.',
    },
  ];

  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '22';
  public name: string = 'Crawdaunt';
  public fullName: string = 'Crawdaunt LA';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Gripthrow
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      COIN_FLIP_PROMPT(store, state, player, (result) => {
        if (result) {
          MOVE_POKEMON_OFF_BOARD(store, state, opponent.active, {
            pokemonDestination: opponent.hand,
            sourceCard: this,
          });
        }
      });
    }

    // Prop-up Pinchers
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;
      const hasTm = cardList.tools.some((t) => t.tags.includes(CardTag.RETRO_TM));
      if (hasTm) {
        effect.damage += 30;
      }
    }

    return state;
  }
}

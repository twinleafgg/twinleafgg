import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AFTER_ATTACK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { SHUFFLE_THIS_POKEMON_AND_ALL_ATTACHED_CARDS_INTO_YOUR_DECK } from '../../../game/store/prefabs/attack-effects';
import { OPPONENT_CANNOT_PLAY_ITEM_CARDS } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Beheeyem extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Elgyem';
  public cardType: CardType[] = [P];
  public hp: number = 80;
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Psypunch',
      cost: [P],
      damage: 20,
      text: '',
    },
    {
      name: 'Mysterious Noise',
      cost: [C, C, C],
      damage: 90,
      text: 'Shuffle this Pokémon and all cards attached to it into your deck. Your opponent can\'t play any Item cards from their hand during their next turn.',
    }
  ];

  public set: string = 'UNM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '91';
  public name: string = 'Beheeyem';
  public fullName: string = 'Beheeyem UNM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 1, this)) {
      OPPONENT_CANNOT_PLAY_ITEM_CARDS(store, state, effect, this);
    }

    if (AFTER_ATTACK(effect, 1, this)) {
      SHUFFLE_THIS_POKEMON_AND_ALL_ATTACHED_CARDS_INTO_YOUR_DECK(store, state, effect);
    }

    return state;
  }
}
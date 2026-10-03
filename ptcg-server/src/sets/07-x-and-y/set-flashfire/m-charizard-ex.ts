import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { StateUtils } from '../../../game';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { MEGA_EVOLUTION_END_TURN } from '../../../game/store/prefabs/tool-prefabs';

export class MCharizardEX extends PokemonCard {
  public stage: Stage = Stage.MEGA;

  protected _tags = [CardTag.POKEMON_EX, CardTag.MEGA];

  public evolvesFrom = 'Charizard-EX';

  public cardType: CardType[] = [CardType.DRAGON];

  public hp: number = 230;

  public weakness = [{ type: CardType.FAIRY }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Wild Blaze',
      cost: [CardType.FIRE, CardType.FIRE, CardType.DARK, CardType.COLORLESS, CardType.COLORLESS],
      damage: 300,
      text: 'Discard the top 5 cards of your deck.',
    },
  ];

  public set: string = 'FLF';

  public name: string = 'M Charizard-EX';

  public fullName: string = 'M Charizard EX FLF';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '69';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    MEGA_EVOLUTION_END_TURN(store, state, effect, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Discard 2 cards from opponent's deck
      MOVE_CARDS(store, state, opponent.deck, opponent.discard, { count: 5, sourceCard: this });
    }
    return state;
  }
}

import {
  PokemonCard,
  Stage,
  CardType,
  PowerType,
  StoreLike,
  State,
  StateUtils,
  CardTag,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ADAPTIVE_EVOLUTION } from '../../../game/store/prefabs/prefabs';

export class Luxio extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Shinx';
  public cardType: CardType[] = [L];
  public hp: number = 90;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [
    {
      name: 'Fighting Roar',
      powerType: PowerType.ABILITY,
      text: "If your opponent's Active Pokémon is a Pokémon ex, this Pokémon can evolve during your first turn or the turn you play it.",
    },
  ];

  public attacks = [
    {
      name: 'Static Shock',
      cost: [L, C],
      damage: 40,
      text: '',
    },
  ];

  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '27';
  public name: string = 'Luxio';
  public fullName: string = 'Luxio M3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    return ADAPTIVE_EVOLUTION(store, state, effect, this, {
      canActivate: (_store, state, player) => {
        const opponent = StateUtils.getOpponent(state, player);
        const opponentActive = opponent.active.getPokemonCard();
        return !!opponentActive && opponentActive.hasTag(CardTag.POKEMON_ex);
      },
    });
  }
}

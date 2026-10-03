import { PowerType, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { ADAPTIVE_EVOLUTION } from '../../../game/store/prefabs/prefabs';

export class Shelmet extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 60;
  public weakness = [{ type: R }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Stimulated Evolution',
    text: 'If you have Karrablast in play, this Pokémon can evolve during your first turn or the turn you play it.',
    powerType: PowerType.ABILITY
  }];

  public attacks = [{
    name: 'Headbutt Bounce',
    cost: [C],
    damage: 10,
    text: ''
  }];

  public set: string = 'WHT';
  public regulationMark = 'I';
  public name: string = 'Shelmet';
  public fullName: string = 'Shelmet WHT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '8';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    return ADAPTIVE_EVOLUTION(store, state, effect, this, {
      canActivate: (_store, _state, player) => {
        return player.active.getPokemonCard()?.name === 'Karrablast'
          || player.bench.some(b => b.getPokemonCard()?.name === 'Karrablast');
      },
    });
  }
}

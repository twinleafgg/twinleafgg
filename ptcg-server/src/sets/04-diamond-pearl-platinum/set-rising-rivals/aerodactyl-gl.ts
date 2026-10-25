import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { DEFENDING_POKEMON_CANNOT_EVOLVE_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class AerodactylGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [F];
  public weakness = [{ type: L, value: +20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Collect',
    cost: [C],
    damage: 0,
    text: 'Draw 2 cards.'
  }, {
    name: 'Primal Breath',
    cost: [F, C],
    damage: 30,
    text: 'Your opponent can\'t play any Pokémon from his or her hand to Evolve or to Level-Up the Defending Pokémon during his or her next turn.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '55';
  public name: string = 'Aerodactyl GL';
  public fullName: string = 'Aerodactyl GL RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Collect
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DRAW_CARDS(store, state, effect.player, 2);
    }

    // Primal Breath
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return DEFENDING_POKEMON_CANNOT_EVOLVE_NEXT_TURN(store, state, effect, this);
    }

    return state;
  }
}

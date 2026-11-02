import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { CONFIRMATION_PROMPT, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Luxray extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Luxio';
  public hp: number = 120;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +30 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Flash',
    cost: [L],
    damage: 30,
    text: 'If the Defending Pokémon tries to attack during your opponent\'s next turn, your opponent flips a coin. If tails, that attack does nothing.'
  }, {
    name: 'Gadget Bolt',
    cost: [L, C, C],
    damage: 60,
    text: 'If Luxray has a Pokémon Tool card attached to it, you may do 100 damage instead of 60 to the Defending Pokémon. If you do, discard that Pokémon Tool card.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Luxray';
  public fullName: string = 'Luxray AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flash
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK(store, state, effect, this);
    }

    // Gadget Bolt
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const tools = [...effect.source.tools];
      if (tools.length === 0) {
        return state;
      }
      CONFIRMATION_PROMPT(store, state, effect.player, result => {
        if (result) {
          effect.damage = 100;
          MOVE_CARDS(store, state, effect.source, effect.player.discard, { cards: tools, sourceCard: this });
        }
      });
    }

    return state;
  }
}

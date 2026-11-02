import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PlayerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class WeavileG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Call for Family',
    cost: [],
    damage: 0,
    text: 'Search your deck for up to 2 basic Pokémon SP and put them onto your Bench. Shuffle your deck afterward.'
  }, {
    name: 'Team Attack',
    cost: [D, C, C],
    damage: 10,
    damageCalculation: '+',
    text: 'Does 10 damage plus 10 more damage for each Pokémon SP you have in play.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '17';
  public name: string = 'Weavile G';
  public fullName: string = 'Weavile G PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Call for Family
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof PokemonCard) || card.stage !== Stage.BASIC || !card.hasTag(CardTag.POKEMON_SP)) {
          blocked.push(index);
        }
      });
      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH(store, state, player, { stage: Stage.BASIC }, { min: 0, max: 2, blocked });
    }

    // Team Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      let spCount = 0;
      effect.player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card) => {
        if (card.hasTag(CardTag.POKEMON_SP)) {
          spCount++;
        }
      });
      effect.damage += 10 * spCount;
    }

    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND, THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Mantine extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Group Swim',
    cost: [W],
    damage: 0,
    text: 'Search your deck for a Water Pokémon, show it to your opponent, and put it into your hand. Shuffle your deck afterward.'
  },
  {
    name: 'Aqua Slash',
    cost: [W, W],
    damage: 40,
    text: 'Mantine can\'t attack during your next turn.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '45';
  public name: string = 'Mantine';
  public fullName: string = 'Mantine HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Group Swim
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof PokemonCard) || !card.cardType.includes(CardType.WATER)) {
          blocked.push(index);
        }
      });
      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(
        store,
        state,
        player,
        {},
        { min: 0, max: 1, allowCancel: true, blocked }
      );
    }

    // Aqua Slash
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(effect.player);
    }

    return state;
  }
}

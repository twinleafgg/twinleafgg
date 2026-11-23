import { CardType, PokemonCard, Stage, State, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SEARCH_DECK_FOR_CARDS_TO_HAND, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Munchlax extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Thudding March',
    cost: [],
    damage: 0,
    text: 'Search your deck for up to 3 Pokémon with a Retreat Cost of 4, reveal them, and put them into your hand. Then, shuffle your deck.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '72';
  public name: string = 'Munchlax';
  public fullName: string = 'Munchlax FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Thudding March
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof PokemonCard && card.retreat.length === 4)) {
          blocked.push(index);
        }
      });

      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        player,
        this,
        { superType: SuperType.POKEMON },
        { min: 0, max: 3, allowCancel: false, blocked },
        this.attacks[0],
      );
    }

    return state;
  }
}

import { Card, ChooseCardsPrompt, GameMessage, ShuffleDeckPrompt, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Scrafty extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Scraggy';
  public cardType: CardType[] = [D];
  public hp: number = 120;
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Nab \'n Dash',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a number of cards up to the number of your Benched Pokémon and put them into your hand. Then, shuffle your deck.'
  }, {
    name: 'High Jump Kick',
    cost: [D, C, C],
    damage: 100,
    text: ''
  }];

  public regulationMark = 'H';
  public set: string = 'SVP';
  public setNumber = '188';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Scrafty';
  public fullName: string = 'Scrafty SVP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let cards: Card[] = [];

      const benched = player.bench.filter(b => b.cards.length > 0).length;

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        {},
        { min: 0, max: benched, allowCancel: false }
      ), selected => {
        cards = selected || [];

        MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });
    }
    return state;
  }
}

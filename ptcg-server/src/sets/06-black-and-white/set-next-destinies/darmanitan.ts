import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MULTIPLE_COIN_FLIPS_PROMPT, DRAW_CARDS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';

export class Darmanitan extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Darumaka';
  public cardType: CardType[] = [P];
  public hp: number = 110;
  public weakness = [{ type: P }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Synchrodraw',
    cost: [P],
    damage: 0,
    text: 'Shuffle your hand into your deck. Then, draw a number of cards equal to the number of cards in your opponent\'s hand.'
  }, {
    name: 'DarMAXitan',
    cost: [C, C],
    damage: 50,
    damageCalculation: 'x',
    text: 'Flip a coin for each Energy attached to this Pokémon. This attack does 50 damage times the number of heads.'
  }];

  public set: string = 'NXD';
  public setNumber: string = '60';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Darmanitan';
  public fullName: string = 'Darmanitan NXD';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Synchrodraw - shuffle hand, draw equal to opponent's hand
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const opponentHandSize = opponent.hand.cards.length;

      // Shuffle hand into deck
      const cardsToShuffle = player.hand.cards.slice();
      MOVE_CARDS(store, state, player.hand, player.deck, { cards: cardsToShuffle, sourceCard: this });

      return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
        player.deck.applyOrder(order);

        // Draw cards equal to opponent's hand size
        if (opponentHandSize > 0) {
          DRAW_CARDS(store, state, player, opponentHandSize);
        }
      });
    }

    // DarMAXitan - flip coins for each energy attached
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const energyCount = player.active.cards.filter(c => c.superType === SuperType.ENERGY).length;

      if (energyCount === 0) {
        effect.damage = 0;
        return state;
      }

      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, energyCount, results => {
        const heads = results.filter(r => r).length;
        effect.damage = 50 * heads;
      });
    }

    return state;
  }
}

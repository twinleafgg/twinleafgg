import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameMessage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Lombre extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Lotad';
  public hp: number = 80;
  public cardType: CardType[] = [G];
  public weakness = [{ type: L, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Interrupt',
    cost: [C, C],
    damage: 20,
    text: 'Flip a coin. If heads, look at your opponent\'s hand and choose 1 card, then have your opponent shuffle that card into his or her deck.'
  }, {
    name: 'Gentle Slap',
    cost: [G, C, C],
    damage: 60,
    text: ''
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '52';
  public name: string = 'Lombre';
  public fullName: string = 'Lombre PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Interrupt
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result || opponent.hand.cards.length === 0) {
          return;
        }
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          opponent.hand,
          {},
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          const cards = selected || [];
          if (cards.length === 0) {
            return;
          }
          MOVE_CARDS(store, state, opponent.hand, opponent.deck, { cards, sourceCard: this, sourceEffect: this.attacks[0] });
          SHUFFLE_DECK(store, state, opponent);
        });
      });
    }

    return state;
  }
}

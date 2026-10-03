import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, BLOCK_IF_DISCARD_EMPTY, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { FLIP_A_COIN_UNTIL_YOU_GET_TAILS_DO_X_DAMAGE_PER_HEADS } from '../../../game/store/prefabs/attack-effects';
import { Card } from '../../../game/store/card/card';

export class Durant extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [M];
  public hp: number = 70;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Pull Out',
      cost: [C],
      damage: 0,
      text: 'Put a card from your discard pile on top of your deck.'
    },
    {
      name: 'Iron Head',
      cost: [M, C],
      damage: 30,
      damageCalculation: 'x',
      text: 'Flip a coin until you get tails. This attack does 30 damage times the number of heads.'
    }
  ];

  public set: string = 'DRX';
  public setNumber: string = '83';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Durant';
  public fullName: string = 'Durant DRX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 1: Pull Out - put a card from discard on top of deck
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      BLOCK_IF_DISCARD_EMPTY(player);

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DECK,
        player.discard,
        {},
        { min: 1, max: 1, allowCancel: false }
      ), (selected: Card[] | null) => {
        const cards = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.discard, player.deck, { cards: cards, sourceCard: this });
          // Put on top of deck - moveCardsTo already puts on top
        }
      });
    }

    // Attack 2: Iron Head - flip until tails, 30x heads
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return FLIP_A_COIN_UNTIL_YOU_GET_TAILS_DO_X_DAMAGE_PER_HEADS(store, state, effect, 30);
    }

    return state;
  }
}

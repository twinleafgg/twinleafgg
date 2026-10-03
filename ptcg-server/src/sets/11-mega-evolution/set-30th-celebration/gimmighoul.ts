import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameMessage, StoreLike, State } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {COIN_FLIP_PROMPT, SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Gimmighoul extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Strolls So Much',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, search your deck for a card and put it into your hand. Then, shuffle your deck.'
  }];

  public regulationMark: string = 'J';
  public set: string = '30C';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '81';
  public name: string = 'Gimmighoul';
  public fullName: string = 'Gimmighoul 30C';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Strolls So Much
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (result) {
          if (player.deck.cards.length === 0) {
            return;
          }

          store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.deck,
            {},
            { min: 1, max: 1, allowCancel: false }
          ), selected => {
            if (selected && selected.length > 0) {
              MOVE_CARDS(store, state, player.deck, player.hand, { cards: selected, sourceCard: this });
            }
            SHUFFLE_DECK(store, state, player);
          });
        }
      });
    }

    return state;
  }
}

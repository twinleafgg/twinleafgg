import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameMessage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { COIN_FLIP_PROMPT, MOVE_CARDS, SHOW_CARDS_TO_PLAYER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Misdreavus extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D, value: +10 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Take Back',
    cost: [],
    damage: 0,
    text: 'Flip a coin. If heads, search your discard pile for a Trainer card, show it to your opponent, and put it into your hand.'
  }, {
    name: 'Tackle',
    cost: [C],
    damage: 10,
    text: ''
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';
  public name: string = 'Misdreavus';
  public fullName: string = 'Misdreavus PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Take Back
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          return;
        }
        const player = effect.player;
        const opponent = effect.opponent;
        if (!player.discard.cards.some(card => card.superType === SuperType.TRAINER)) {
          return;
        }
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          { superType: SuperType.TRAINER },
          { min: 0, max: 1, allowCancel: false }
        ), selected => {
          if (selected) {
            MOVE_CARDS(store, state, player.discard, player.hand, { cards: selected });
            SHOW_CARDS_TO_PLAYER(store, state, opponent, selected);
          }
        });
      });
    }

    return state;
  }
}

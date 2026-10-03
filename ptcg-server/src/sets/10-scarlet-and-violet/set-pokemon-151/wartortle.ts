import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { GameMessage } from '../../../game/game-message';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { State } from '../../../game/store/state/state';

import { StoreLike } from '../../../game/store/store-like';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Wartortle extends PokemonCard {
  public stage = Stage.STAGE_1;
  public evolvesFrom = 'Squirtle';
  public cardType: CardType[] = [W];
  public hp = 100;
  public weakness = [{ type: L }];
  public retreat = [C, C];

  attacks = [{
    name: 'Free Diving',
    cost: [W],
    damage: 0,
    text: 'Put up to 3 [W] Energy cards from your discard pile into your hand.'
  },
  {
    name: 'Spinning Attack',
    cost: [W, W],
    damage: 50,
    text: ''
  }];

  public regulationMark = 'G';
  public set: string = 'MEW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '8';
  public name: string = 'Wartortle';
  public fullName: string = 'Wartortle MEW';

  reduceEffect(store: StoreLike, state: State, effect: Effect) {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const prompt = new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.discard,
        {
          cardType: [CardType.WATER]
        },
        {
          min: 0,
          max: 3
        }
      );
      state = store.prompt(state, prompt, chosenCards => {
        MOVE_CARDS(store, state, player.discard, player.hand, { cards: chosenCards, sourceCard: this });
      });
    }
    return state;
  }
}
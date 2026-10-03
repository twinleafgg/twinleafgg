import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { Card, ChooseCardsPrompt, ShuffleDeckPrompt } from '../../../game';
import { StoreLike, State, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {SHOW_CARDS_TO_PLAYER, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Gimmighoul extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [P];

  public hp: number = 70;

  public weakness = [{ type: D }];

  public resistance = [{ type: F, value: -30 }];

  public retreat = [C, C];

  public attacks = [
    {
      name: 'Minor Errand-Running',
      cost: [C],
      damage: 0,
      text: 'Search your deck for up to 2 Basic Energy cards, reveal them, and put them into your hand. Then, shuffle your deck.'
    },

    {
      name: 'Tackle',
      cost: [C, C, C],
      damage: 50,
      text: ''
    }
  ];

  public regulationMark = 'H';

  public setNumber = '97';

  public set: string = 'SSP';

  public name: string = 'Gimmighoul';

  public fullName: string = 'Gimmighoul SSP';

  public cardImage: string = 'assets/cardback.png';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Minor Errand-Running
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      if (player.deck.cards.length === 0) {
        return state;
      }

      let cards: Card[] = [];
      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { min: 0, max: 2, allowCancel: false }
      ), selected => {
        cards = selected || [];

        SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);

        MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });
      });

      return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
        player.deck.applyOrder(order);
      });
    }

    return state;
  }
} 
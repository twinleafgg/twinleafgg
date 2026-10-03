import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, TrainerType } from '../../../game/store/card/card-types';
import { PowerType, State, StoreLike, GameMessage, StateUtils, Card, GameError } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { SuperType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt } from '../../../game';
import { CardList } from '../../../game';

import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Trumbeak extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Pikipek';

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 80;

  public weakness = [{ type: CardType.LIGHTNING }];

  public resistance = [{ type: CardType.FIGHTING, value: -20 }];

  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'Mountain Pass',
    useFromHand: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), if this Pokémon is in your hand, you may reveal it. If you do, look at the top card of your opponent\'s deck and put this Pokémon in the Lost Zone. If that card is a Supporter card, you may put it in the Lost Zone. If your opponent has no cards in their deck, you can\'t use this Ability.'
  }];

  public attacks = [
    {
      name: 'Peck',
      cost: [CardType.COLORLESS, CardType.COLORLESS],
      damage: 30,
      text: ''
    }
  ];

  public set: string = 'LOT';

  public setNumber = '165';

  public cardImage = 'assets/cardback.png';

  public name: string = 'Trumbeak';

  public fullName: string = 'Trumbeak LOT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      MOVE_CARDS(store, state, player.hand, player.lostzone, { cards: [this], sourceCard: this });

      const cards: Card[] = [];
      const card = opponent.deck.cards[0];
      cards.push(card);

      const deckTop = new CardList();
      MOVE_CARDS(store, state, opponent.deck, deckTop, { count: 1, sourceCard: this });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        deckTop,
        { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
        { min: 0, max: 1, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        if (!cards) {
          MOVE_CARDS(store, state, deckTop, opponent.deck, { count: 1, sourceCard: this });
        }
        if (cards) {
          MOVE_CARDS(store, state, deckTop, opponent.lostzone, { cards: cards, sourceCard: this });
        }
      });

    }

    return state;
  }
}

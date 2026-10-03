import { Card, CardList, ChooseCardsPrompt, GameError, GameMessage } from '../../../game';
import { CardType, EnergyType } from '../../../game/store/card/card-types';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class AuroraEnergy extends EnergyCard {

  public provides: CardType[] = [CardType.COLORLESS];

  public energyType = EnergyType.SPECIAL;

  public set: string = 'SSH';

  public regulationMark = 'D';

  public name = 'Aurora Energy';

  public fullName = 'Aurora Energy SSH';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '186';

  public text =
    `You can attach this card to 1 of your Pokémon only if you discard another card from your hand.
    
As long as this card is attached to a Pokémon, it provides every type of Energy but provides only 1 Energy at a time.`;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckProvidedEnergyEffect && effect.source.cards.includes(this)) {
      effect.energyMap.push({ card: this, provides: [CardType.ANY] });
    }

    if (effect instanceof AttachEnergyEffect && effect.energyCard === this) {
      const generator = playCard(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }
    return state;
  }
}

function* playCard(next: Function, store: StoreLike, state: State, self: AuroraEnergy, effect: AttachEnergyEffect): IterableIterator<State> {

  const player = effect.player;
  let cards: Card[] = [];

  cards = player.hand.cards.filter(c => c !== self);
  if (cards.length < 1) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  const handTemp = new CardList();
  handTemp.cards = player.hand.cards.filter(c => c !== self);

  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_DISCARD,
    handTemp,
    {},
    { min: 1, max: 1, allowCancel: false }
  ), selected => {
    cards = selected || [];
    next();
  });

  // Operation canceled by the user
  if (cards.length === 0) {
    return state;
  }

  MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: self });
  MOVE_CARDS(store, state, player.supporter, player.discard, { cards: [self], sourceCard: self });

  return state;
}

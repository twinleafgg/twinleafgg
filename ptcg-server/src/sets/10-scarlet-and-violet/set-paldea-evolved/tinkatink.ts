import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, TrainerType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, TrainerCard, GameError, GameMessage, Card, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useScrapPickup(next: Function, store: StoreLike, state: State, self: Tinkatink, effect: AttackEffect): IterableIterator<State> {
  const player = effect.player;

  const hasItem = player.discard.cards.some(c => {
    return c instanceof TrainerCard && c.trainerType === TrainerType.ITEM;
  });

  if (!hasItem) {
    throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
  }

  // We will discard this card after prompt confirmation
  effect.preventDefault = true;

  let cards: Card[] = [];
  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_HAND,
    player.discard,
    { superType: SuperType.TRAINER, trainerType: TrainerType.ITEM },
    { min: 1, max: 1, allowCancel: true }
  ), selected => {
    cards = selected || [];
    next();
  });

  if (cards.length > 0) {
    MOVE_CARDS(store, state, player.hand, player.discard, { cards: [self], sourceCard: self });
    MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: self });
  }

  return state;
}

export class Tinkatink extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.PSYCHIC];
  public hp: number = 60;
  public weakness = [{ type: CardType.METAL }];
  public retreat = [CardType.COLORLESS];

  public attacks = [{
    name: 'Scrap Pickup',
    cost: [CardType.COLORLESS],
    damage: 0,
    text: 'Put an Item card from your discard pile into your hand.'
  },
  {
    name: 'Fairy Wind',
    cost: [CardType.PSYCHIC, CardType.COLORLESS, CardType.COLORLESS],
    damage: 30,
    text: ''
  }];

  public regulationMark: string = 'G';
  public set: string = 'PAL';
  public name: string = 'Tinkatink';
  public fullName: string = 'Tinkatink PAL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '101';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof AttackEffect && effect.attack == this.attacks[0]) {
      const generator = useScrapPickup(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }
    return state;
  }

}
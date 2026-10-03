import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, SHUFFLE_DECK, BLOCK_IF_DECK_EMPTY, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { ShowCardsPrompt } from '../../../game/store/prompts/show-cards-prompt';

function* useOdorSleuth(next: Function, store: StoreLike, state: State,
  self: Stoutland, player: any, opponent: any): IterableIterator<State> {

  BLOCK_IF_DECK_EMPTY(player);

  let cards: Card[] = [];
  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_HAND,
    player.deck,
    {},
    { min: 0, max: 2, allowCancel: false }
  ), selected => {
    cards = selected || [];
    next();
  });

  if (cards.length > 0) {
    MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: self });

    // Show cards to opponent
    yield store.prompt(state, new ShowCardsPrompt(
      opponent.id,
      GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
      cards
    ), () => next());
  }

  return SHUFFLE_DECK(store, state, player);
}

export class Stoutland extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Herdier';
  public cardType: CardType[] = [C];
  public hp: number = 140;
  public weakness = [{ type: F }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Odor Sleuth',
      cost: [C],
      damage: 0,
      text: 'Search your deck for up to 2 cards and put them into your hand. Show those cards to your opponent. Shuffle your deck afterward.'
    },
    {
      name: 'Wild Tackle',
      cost: [C, C, C, C],
      damage: 100,
      text: 'This Pokémon can\'t attack during your next turn.'
    }
  ];

  public set: string = 'BLW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '83';
  public name: string = 'Stoutland';
  public fullName: string = 'Stoutland BLW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const generator = useOdorSleuth(() => generator.next(), store, state, this, player, opponent);
      return generator.next().value;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      player.active.cannotAttackNextTurnPending = true;
    }

    return state;
  }
}

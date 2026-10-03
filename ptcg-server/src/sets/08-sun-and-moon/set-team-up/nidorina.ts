import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, pokemonHasCardType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { SuperType } from '../../../game/store/card/card-types';
import { ShuffleDeckPrompt } from '../../../game/store/prompts/shuffle-prompt';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useFamilyRescue(
  next: Function,
  store: StoreLike,
  state: State,
  effect: AttackEffect,
): IterableIterator<State> {
  const player = effect.player;
  const blocked: number[] = [];
  let psychicCount = 0;
  player.discard.cards.forEach((c, idx) => {
    if (c instanceof PokemonCard && pokemonHasCardType(c, CardType.PSYCHIC)) {
      psychicCount++;
    } else {
      blocked.push(idx);
    }
  });

  if (psychicCount === 0) {
    return state;
  }

  const max = Math.min(5, psychicCount);
  let cards: PokemonCard[] = [];
  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_DECK,
      player.discard,
      { superType: SuperType.POKEMON },
      { min: 0, max, allowCancel: false, blocked },
    ),
    (selected) => {
      cards = (selected as PokemonCard[]) || [];
      next();
    },
  );
  MOVE_CARDS(store, state, player.discard, player.deck, { cards: cards, sourceCard: effect.source.getPokemonCard()! });
  if (cards.length > 0) {
    yield store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
      player.deck.applyOrder(order);
    });
  }
}

export class Nidorina extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Nidoran ♀';
  public cardType: CardType[] = [P];
  public hp = 90;
  public weakness = [{ type: P }];
  public resistance = [];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Family Rescue',
      cost: [C],
      damage: 0,
      text: 'Shuffle 5 [P] Pokémon from your discard pile into your deck.',
    },
    {
      name: 'Bite',
      cost: [C, C],
      damage: 30,
      text: '',
    },
  ];

  public set: string = 'TEU';
  public setNumber: string = '55';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Nidorina';
  public fullName: string = 'Nidorina TEU';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useFamilyRescue(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    return state;
  }
}

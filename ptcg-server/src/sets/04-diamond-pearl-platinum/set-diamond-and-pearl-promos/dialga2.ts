import { Card } from '../../../game';
import { CardManager } from '../../../game';
import { CardTarget } from '../../../game';
import { ChooseCardsPrompt } from '../../../game';
import { ChoosePokemonPrompt } from '../../../game';
import { GameMessage } from '../../../game';
import { PlayerType } from '../../../game';
import { PokemonCardList } from '../../../game';
import { ShuffleDeckPrompt } from '../../../game';
import { SlotType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { MULTIPLE_COIN_FLIPS_PROMPT } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

function* useTimeCall(next: Function, store: StoreLike, state: State, effect: AttackEffect): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length === 0) {
    return state;
  }

  const cm = CardManager.getInstance();
  const evolutions = cm.getAllCards().filter(c => {
    return c instanceof PokemonCard && c.stage !== Stage.BASIC;
  }) as PokemonCard[];

  const evolutionNames: string[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card) => {
    evolutions.forEach(e => {
      if (e.evolvesFrom === card.name && !evolutionNames.includes(e.name)) {
        evolutionNames.push(e.name);
      }
    });
  });

  const blocked: number[] = [];
  player.deck.cards.forEach((card, index) => {
    if (!(card instanceof PokemonCard) || !evolutionNames.includes(card.name)) {
      blocked.push(index);
    }
  });

  let cards: Card[] = [];
  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_EVOLVE,
    player.deck,
    { superType: SuperType.POKEMON },
    { min: 0, max: 1, allowCancel: true, blocked }
  ), selected => {
    cards = selected || [];
    next();
  });

  if (cards.length === 0) {
    return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
      player.deck.applyOrder(order);
    });
  }

  const evolution = cards[0] as PokemonCard;
  const blocked2: CardTarget[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_list, card, target) => {
    if (card.name !== evolution.evolvesFrom) {
      blocked2.push(target);
    }
  });

  let targets: PokemonCardList[] = [];
  yield store.prompt(state, new ChoosePokemonPrompt(
    player.id,
    GameMessage.CHOOSE_POKEMON_TO_EVOLVE,
    PlayerType.BOTTOM_PLAYER,
    [SlotType.ACTIVE, SlotType.BENCH],
    { allowCancel: false, blocked: blocked2 }
  ), selection => {
    targets = selection || [];
    next();
  });

  if (targets.length > 0) {
    MOVE_CARDS(store, state, player.deck, targets[0], { cards: [evolution], sourceCard: effect.source.getPokemonCard()! });
    targets[0].clearEffects();
    targets[0].pokemonPlayedTurn = state.turn;
  }

  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);
  });
}

export class Dialga2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Time Call',
    cost: [M],
    damage: 0,
    text: 'Search your deck for a card that evolves from 1 of your Pokémon and put it onto that Pokémon. (This counts as evolving that Pokémon.) Shuffle your deck afterward.'
  },
  {
    name: 'Time Wager',
    cost: [M, C, C],
    damage: 100,
    text: 'Flip 2 coins. If either of them is tails, this attack\'s base damage is 50 instead of 100.'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP49';
  public name: string = 'Dialga';
  public fullName: string = 'Dialga DPP2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Time Call
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useTimeCall(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    // Time Wager
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        if (results.some(r => !r)) {
          effect.damage = 50;
        }
      });
    }

    return state;
  }
}

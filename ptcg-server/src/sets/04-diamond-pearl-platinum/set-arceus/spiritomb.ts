import { Card, CardManager, CardTarget, ChooseCardsPrompt, ChoosePokemonPrompt, GameError, GameMessage, PlayerType, PokemonCardList, PowerType, ShuffleDeckPrompt, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { AttachPokemonToolEffect, PlayItemEffect, PlayStadiumEffect, PlaySupporterEffect } from '../../../game/store/effects/play-card-effects';
import { IS_POKEBODY_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

function* playCard(next: Function, store: StoreLike, state: State, effect: AttackEffect): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length === 0) {
    return state;
  }

  const cm = CardManager.getInstance();
  const evolutions = cm.getAllCards().filter(c => {
    return c instanceof PokemonCard && c.stage !== Stage.BASIC;
  }) as PokemonCard[];

  const evolutionNames: string[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
    const valid = evolutions.filter(e => e.evolvesFrom === card.name);
    valid.forEach(c => {
      if (!evolutionNames.includes(c.name)) {
        evolutionNames.push(c.name);
      }
    });
  });

  if (evolutionNames.length === 0) {
    throw new GameError(GameMessage.CANNOT_USE_ATTACK);
  }

  const blocked: number[] = [];
  player.deck.cards.forEach((card, index) => {
    if (card instanceof PokemonCard && !evolutionNames.includes(card.name)) {
      blocked.push(index);
    }
  });

  let cards: Card[] = [];
  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_EVOLVE,
    player.deck,
    { superType: SuperType.POKEMON },
    { min: 1, max: 1, allowCancel: true, blocked }
  ), selected => {
    cards = selected || [];
    next();
  });

  if (cards.length === 0) {
    return state;
  }

  const evolution = cards[0] as PokemonCard;
  const blocked2: CardTarget[] = [];
  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
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

  if (targets.length === 0) {
    return state;
  }
  const pokemonCard = targets[0].getPokemonCard();
  if (pokemonCard === undefined) {
    return state;
  }

  MOVE_CARDS(store, state, player.deck, targets[0], { cards: [evolution], sourceCard: effect.source.getPokemonCard()! });
  targets[0].clearEffects();
  targets[0].pokemonPlayedTurn = state.turn;
  effect.source.damage += 10;

  return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
    player.deck.applyOrder(order);
  });
}

export class Spiritomb extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [D];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Keystone Seal',
    powerType: PowerType.POKEBODY,
    text: 'As long as Spiritomb is your Active Pokémon, each player can\'t play any Trainer cards from his or her hand.'
  }];

  public attacks = [{
    name: 'Darkness Grace',
    cost: [],
    damage: 0,
    text: 'Search your deck for a card that evolves from 1 of your Pokémon and put it onto that Pokémon. (This counts as evolving that Pokémon.) If you do, put 1 damage counter on Spiritomb. Shuffle your deck afterward.'
  }, {
    name: 'Will-o\'-the-wisp',
    cost: [D],
    damage: 10,
    text: ''
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '32';
  public name: string = 'Spiritomb';
  public fullName: string = 'Spiritomb AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Keystone Seal
    if (
      effect instanceof PlayItemEffect ||
      effect instanceof PlaySupporterEffect ||
      effect instanceof AttachPokemonToolEffect ||
      effect instanceof PlayStadiumEffect
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (
        (player.active.getPokemonCard() === this && !IS_POKEBODY_BLOCKED(store, state, player, this)) ||
        (opponent.active.getPokemonCard() === this && !IS_POKEBODY_BLOCKED(store, state, opponent, this))
      ) {
        throw new GameError(GameMessage.BLOCKED_BY_ABILITY);
      }
    }

    // Darkness Grace
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = playCard(() => generator.next(), store, state, effect);
      return generator.next().value;
    }

    return state;
  }
}

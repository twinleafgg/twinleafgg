import { Card, PokemonCard, Stage, CardType, StoreLike, State, GameMessage, StateUtils, PlayerType, ChooseCardsPrompt } from '../../game';
import { AfterDamageEffect, HealTargetEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { AttackEffect } from '../../game/store/effects/game-effects';
import { WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

function* useKnockOff(next: Function, store: StoreLike, state: State,
  effect: AttackEffect): IterableIterator<State> {

  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  // Opponent has no cards in the hand
  if (opponent.hand.cards.length === 0) {
    return state;
  }

  let flipResult = false;
  yield COIN_FLIP_PROMPT(store, state, player, result => {
    flipResult = result;
    next();
  });

  if (!flipResult) {
    return state;
  }

  let cards: Card[] = [];
  yield store.prompt(state, new ChooseCardsPrompt(
    player,
    GameMessage.CHOOSE_CARD_TO_DISCARD,
    opponent.hand,
    {},
    { min: 1, max: 1, allowCancel: false, isSecret: true }
  ), selected => {
    cards = selected || [];
    next();
  });

  MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: cards, sourceCard: effect.source.getPokemonCard()! });
  return state;
}

export class Croagunk extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: 10 }];
  public retreat = [C, C];

  public attacks = [{
    // Knock Off
    name: 'Knock Off',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, choose 1 card from your opponent\'s hand without looking and discard it.'
  }, {
    // Nimble
    name: 'Nimble',
    cost: [P, P],
    damage: 30,
    text: 'If you have Turtwig in play, remove from Croagunk the number of damage counters equal to the damage you did to the Defending Pokemon.'
  }];

  public set: string = 'OP9';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '7';
  public name: string = 'Croagunk';
  public fullName: string = 'Croagunk OP9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useKnockOff(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    if (effect instanceof AfterDamageEffect && effect.attack === this.attacks[1]) {
      const player = effect.player;
      let isTurtwigInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card.name === 'Turtwig') {
          isTurtwigInPlay = true;
        }
      });
      if (!isTurtwigInPlay) {
        return state;
      }
      const healEffect = new HealTargetEffect(effect.attackEffect, effect.damage);
      healEffect.target = player.active;
      return store.reduceEffect(state, healEffect);
    }
    return state;
  }
}

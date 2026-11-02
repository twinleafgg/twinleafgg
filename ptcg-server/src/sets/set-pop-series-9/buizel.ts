import { PokemonCard, Stage, CardType, SuperType, StoreLike, State, GameMessage, StateUtils, Card, ChooseCardsPrompt, PlayerType } from '../../game';
import { DiscardCardsEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { AttackEffect } from '../../game/store/effects/game-effects';
import { PREVENT_DAMAGE, PREVENT_EFFECTS_OF_ATTACKS } from '../../game/store/prefabs/effect-of-attack-prefabs';
import { WAS_ATTACK_USED, COIN_FLIP_PROMPT } from '../../game/store/prefabs/prefabs';

function* useWhirlpool(next: Function, store: StoreLike, state: State,
  effect: AttackEffect): IterableIterator<State> {

  const player = effect.player;
  const opponent = StateUtils.getOpponent(state, player);

  // Defending Pokemon has no energy cards attached
  if (!opponent.active.cards.some(c => c.superType === SuperType.ENERGY)) {
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
    opponent.active,
    { superType: SuperType.ENERGY },
    { min: 1, max: 1, allowCancel: false }
  ), selected => {
    cards = selected || [];
    next();
  });

  const discardEnergy = new DiscardCardsEffect(effect, cards);
  return store.reduceEffect(state, discardEnergy);
}

export class Buizel extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: 10 }];
  public retreat = [C];

  public attacks = [{
    // Whirlpool
    name: 'Whirlpool',
    cost: [W],
    damage: 0,
    text: 'Flip a coin. If heads, discard an Energy attached to the Defending Pokemon.'
  }, {
    // Super Fast
    name: 'Super Fast',
    cost: [W, W],
    damage: 30,
    text: 'If you have Pachirisu in play, flip a coin. If heads, prevent all effects of an attack, including damage, done to Buizel during your opponent\'s next turn.'
  }];

  public set: string = 'OP9';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Buizel';
  public fullName: string = 'Buizel OP9';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const generator = useWhirlpool(() => generator.next(), store, state, effect);
      return generator.next().value;
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      let isPachirisuInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card.name === 'Pachirisu') {
          isPachirisuInPlay = true;
        }
      });
      if (isPachirisuInPlay) {
        state = COIN_FLIP_PROMPT(store, state, player, flipResult => {
          if (flipResult) {
            PREVENT_DAMAGE(store, state, effect, this);
            PREVENT_EFFECTS_OF_ATTACKS(store, state, effect, this);
          }
        });
      }
      return state;
    }
    return state;
  }
}

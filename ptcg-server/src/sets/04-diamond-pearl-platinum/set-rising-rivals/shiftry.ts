import { CardType, PokemonCard, PowerType, Stage, State, StateUtils, StoreLike } from '../../../game';
import { CoinFlipEffect } from '../../../game/store/effects/play-card-effects';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../../game/store/prefabs/attack-effects';
import { DEFENDING_POKEMON_HAS_NO_ABILITIES_UNTIL_END_OF_YOUR_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Shiftry extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Nuzleaf';
  public hp: number = 130;
  public cardType: CardType[] = [D];
  public weakness = [{ type: R, value: +30 }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Unlucky Wind',
    powerType: PowerType.POKEBODY,
    text: 'As long as Shiftry is your Active Pokémon, whenever your opponent flips a coin during his or her turn, treat it as tails.'
  }];

  public attacks = [{
    name: 'Conform',
    cost: [D, C],
    damage: 40,
    text: 'If you have the same number of cards in your hand as your opponent, the Defending Pokémon is now Confused.'
  },
  {
    name: 'Seal Off',
    cost: [D, C, C],
    damage: 60,
    text: 'The Defending Pokémon can\'t use any Poké-Powers or Poké-Bodies during your opponent\'s next turn.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '13';
  public name: string = 'Shiftry';
  public fullName: string = 'Shiftry RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Unlucky Wind
    if (effect instanceof CoinFlipEffect) {
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner.active.getPokemonCard() !== this || IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      const opponent = StateUtils.getOpponent(state, owner);
      if (effect.player !== opponent || state.players[state.activePlayer] !== opponent) {
        return state;
      }
      effect.forcedResult = false;
    }

    // Conform
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (player.hand.cards.length === opponent.hand.cards.length) {
        YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
      }
    }

    // Seal Off
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DEFENDING_POKEMON_HAS_NO_ABILITIES_UNTIL_END_OF_YOUR_NEXT_TURN(store, state, effect, this);
    }

    return state;
  }
}

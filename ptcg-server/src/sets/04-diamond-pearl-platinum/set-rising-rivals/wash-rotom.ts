import { GameError, GameMessage, PlayerType, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { ABILITY_USED, ADD_MARKER, FLIP_UNTIL_TAILS_AND_COUNT_HEADS, HAS_MARKER, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class WashRotom extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 90;
  public cardType: CardType[] = [L];
  public weakness = [{ type: D, value: +20 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Wash Shift',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may use this power. Wash Rotom\'s type is Water until the end of your turn.'
  }];

  public attacks = [{
    name: 'Cleanse Away',
    cost: [C],
    damage: 0,
    text: 'Remove 3 damage counters from each of your Benched Pokémon.'
  }, {
    name: 'Drain Wash',
    cost: [W, C],
    damage: 30,
    text: 'Flip a coin until you get tails. For each heads, choose 1 card from your opponent\'s hand without looking and discard it.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'RT5';
  public name: string = 'Wash Rotom';
  public fullName: string = 'Wash Rotom RR';

  public readonly WASH_SHIFT_MARKER = 'WASH_SHIFT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.WASH_SHIFT_MARKER, this);

    // Wash Shift
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      if (HAS_MARKER(this.WASH_SHIFT_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      ABILITY_USED(player, this);
      ADD_MARKER(this.WASH_SHIFT_MARKER, player, this);
    }

    if (effect instanceof CheckPokemonTypeEffect && effect.target.getPokemonCard() === this) {
      const player = StateUtils.findOwner(state, effect.target);
      if (HAS_MARKER(this.WASH_SHIFT_MARKER, player, this)) {
        effect.cardTypes = [CardType.WATER];
      }
    }

    // Cleanse Away
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList !== player.active) {
          store.reduceEffect(state, new HealEffect(player, cardList, 30));
        }
      });
    }

    // Drain Wash
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      return FLIP_UNTIL_TAILS_AND_COUNT_HEADS(store, state, player, heads => {
        for (let i = 0; i < heads; i++) {
          if (opponent.hand.cards.length === 0) {
            break;
          }
          const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
          const randomCard = opponent.hand.cards[randomIndex];
          MOVE_CARDS(store, state, opponent.hand, opponent.discard, {
            cards: [randomCard],
            sourceCard: this,
          });
        }
      });
    }

    return state;
  }
}

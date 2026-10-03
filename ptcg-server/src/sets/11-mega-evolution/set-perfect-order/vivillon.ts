import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameError, GameMessage, StateUtils, CardList, PowerType, Player } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {ABILITY_USED, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Vivillon extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Spewpa';
  public cardType: CardType[] = [G];
  public hp: number = 120;
  public weakness = [{ type: R }];
  public retreat = [C];

  public powers = [{
    name: 'Grand Wing',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may use this Ability. Your opponent shuffles their hand and puts it on the bottom of their deck. If they put any cards on the bottom of their deck in this way, they draw 4 cards.'
  }];

  public attacks = [{
    name: 'Blow Through',
    cost: [G],
    damage: 60,
    damageCalculation: '+',
    text: 'If there is a Stadium in play, this attack does 60 more damage.'
  }];

  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '9';
  public name: string = 'Vivillon';
  public fullName: string = 'Vivillon M3';

  public readonly BIG_WINGS_MARKER = 'BIG_WINGS_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.marker.hasMarker(this.BIG_WINGS_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (opponent.hand.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Shuffle the opponent's hand
      this.shufflePlayerHand(opponent);

      const deckBottom = new CardList();
      MOVE_CARDS(store, state, opponent.hand, deckBottom, { sourceCard: this });
      MOVE_CARDS(store, state, deckBottom, opponent.deck, { sourceCard: this });
      MOVE_CARDS(store, state, opponent.deck, opponent.hand, { count: 4, sourceCard: this });

      ABILITY_USED(player, this);
      player.marker.addMarker(this.BIG_WINGS_MARKER, this);
      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (stadiumCard !== undefined) {
        effect.damage += 60;
      }
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.BIG_WINGS_MARKER, this)) {
      effect.player.marker.removeMarker(this.BIG_WINGS_MARKER, this);
    }

    return state;
  }

  shufflePlayerHand(player: Player): void {
    const hand = player.hand.cards;

    // Shuffle the hand using the Fisher-Yates shuffle algorithm
    for (let i = hand.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [hand[i], hand[j]] = [hand[j], hand[i]];
    }
  }
}

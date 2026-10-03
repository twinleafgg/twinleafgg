import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';

import { PowerType } from '../../../game/store/card/pokemon-types';
import { GameMessage } from '../../../game/game-message';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { GameError } from '../../../game/game-error';
import { ChoosePokemonPrompt, PlayerType, PokemonCardList, SlotType } from '../../..';
import {DAMAGE_OPPONENT_POKEMON, DRAW_CARDS, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Empoleon extends PokemonCard {

  public stage: Stage = Stage.STAGE_2;

  public evolvesFrom = 'Prinplup';

  public cardType: CardType[] = [CardType.WATER];

  public hp: number = 160;

  public weakness = [{ type: CardType.LIGHTNING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Emergency Surfacing',
    useFromDiscard: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, if this Pokémon is in your discard pile and you have no cards in your hand, you may put this Pokémon onto your Bench. If you do, draw 3 cards.'
  }];

  public attacks = [{
    name: 'Water Arrow',
    cost: [CardType.WATER],
    damage: 0,
    text: 'This attack does 60 damage to 1 of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public regulationMark = 'F';

  public set: string = 'BRS';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '37';

  public name: string = 'Empoleon';

  public fullName: string = 'Empoleon BRS';

  public readonly EMERGENCY_SURFACING_MARKER = 'EMERGENCY_SURFACING_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter(b => b.cards.length === 0);

      // Check if card is in the discard
      if (!player.discard.cards.includes(this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Power already used
      if (player.marker.hasMarker(this.EMERGENCY_SURFACING_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      // No open slots, throw error
      if (slots.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      if (player.hand.cards.length !== 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Add Marker
      player.marker.addMarker(this.EMERGENCY_SURFACING_MARKER, this);

      const cards = player.discard.cards.filter(c => c === this);
      cards.forEach(card => {
        MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this }); // Move to Bench
        DRAW_CARDS(store, state, player, 3);
      });

      if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.EMERGENCY_SURFACING_MARKER, this)) {
        effect.player.marker.removeMarker(this.EMERGENCY_SURFACING_MARKER, this);
      }

      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const targets = selected || [];
        DAMAGE_OPPONENT_POKEMON(store, state, effect, 30, targets);
      });
    }
    return state;
  }
}

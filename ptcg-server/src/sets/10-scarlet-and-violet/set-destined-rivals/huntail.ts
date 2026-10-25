import { Card, GamePhase, PlayerType, PowerType, State, StoreLike, pokemonHasCardTypeOptional } from '../../../game';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { CONFIRMATION_PROMPT, IS_ABILITY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Huntail extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Clamperl';
  public cardType: CardType[] = [W];
  public hp: number = 110;
  public weakness = [{ type: L }];
  public retreat = [C];

  public powers = [
    {
      name: 'Diver Catch',
      powerType: PowerType.ABILITY,
      text: 'You may use this Ability whenever 1 of your [W] Pokémon is Knocked Out by damage from an opponent\'s Pokémon\'s attack. Return all Basic [W] Energy attached to the Knocked Out Pokémon to your hand instead of discarding them.'
    }
  ];

  public attacks = [{
    name: 'Wave Splash',
    cost: [W, C, C],
    damage: 80,
    text: ''
  }];

  public regulationMark = 'I';
  public set: string = 'DRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '55';
  public name: string = 'Huntail';
  public fullName: string = 'Huntail DRI';

  public readonly DIVER_CATCH_MARKER = 'DIVER_CATCH_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Diver Catch
    if (effect instanceof KnockOutEffect) {
      const player = effect.player;

      // Do not activate between turns, or when it's not opponents turn.
      if (state.phase !== GamePhase.ATTACK) {
        return state;
      }
      if (!player.marker.hasMarker(player.DAMAGE_DEALT_MARKER)) {
        return state;
      }
      if (IS_ABILITY_BLOCKED(store, state, player, this)) { return state; }
      if (!pokemonHasCardTypeOptional(effect.target.getPokemonCard(), CardType.WATER)) { return state; }

      let isThisInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, card => {
        if (card.getPokemonCard() === this) {
          isThisInPlay = true;
        }
      });
      if (!isThisInPlay) { return state; }

      const target = effect.target;
      const cards = target.cards.filter(card => card.superType === SuperType.ENERGY && card.energyType === EnergyType.BASIC && card.name === 'Water Energy');
      cards.forEach(card => {
        player.marker.addMarker(this.DIVER_CATCH_MARKER, card);
      });
    }

    if (effect instanceof BetweenTurnsEffect && effect.player.marker.hasMarker(this.DIVER_CATCH_MARKER)) {
      state.players.forEach(player => {

        if (!player.marker.hasMarker(this.DIVER_CATCH_MARKER)) {
          return;
        }

        CONFIRMATION_PROMPT(store, state, player, result => {
          if (result) {

            const rescued: Card[] = player.marker.markers
              .filter(m => m.name === this.DIVER_CATCH_MARKER && m.source !== undefined)
              .map(m => m.source!);

            MOVE_CARDS(store, state, player.discard, player.hand, { cards: rescued });
            player.marker.removeMarker(this.DIVER_CATCH_MARKER);
          }
        });
      });
    }

    return state;
  }
}
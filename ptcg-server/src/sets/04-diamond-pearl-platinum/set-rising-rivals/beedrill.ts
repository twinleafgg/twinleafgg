import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { ABILITY_USED, ADD_PARALYZED_TO_PLAYER_ACTIVE, ADD_POISON_TO_PLAYER_ACTIVE, BLOCK_IF_HAS_SPECIAL_CONDITION, IS_POKEPOWER_BLOCKED, SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Beedrill extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Kakuna';
  public hp: number = 110;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +30 }];
  public retreat = [C];

  public powers = [{
    name: 'Flutter Wings',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may search your deck for a [G] Pokémon, show it to your opponent, and put it into your hand. Shuffle your deck afterward. This power can\'t be used if Beedrill is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Needle Shock',
    cost: [G, C, C],
    damage: 30,
    text: 'The Defending Pokémon is now Paralyzed and Poisoned. Ignore this effect if any of your Pokémon used Needle Shock during your last turn.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '15';
  public name: string = 'Beedrill';
  public fullName: string = 'Beedrill RR';

  public readonly FLUTTER_WINGS_MARKER = 'FLUTTER_WINGS_MARKER';
  public readonly NEEDLE_SHOCK_MARKER = 'NEEDLE_SHOCK_MARKER';
  public readonly CLEAR_NEEDLE_SHOCK_MARKER = 'CLEAR_NEEDLE_SHOCK_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      effect.player.marker.removeMarker(this.FLUTTER_WINGS_MARKER, this);
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.FLUTTER_WINGS_MARKER, this)) {
      effect.player.marker.removeMarker(this.FLUTTER_WINGS_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      if (player.marker.hasMarker(this.FLUTTER_WINGS_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      player.marker.addMarker(this.FLUTTER_WINGS_MARKER, this);
      ABILITY_USED(player, this);
      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(store, state, player, { cardType: [G] }, { min: 0, max: 1, allowCancel: true });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (!effect.player.marker.hasMarker(this.NEEDLE_SHOCK_MARKER, this)) {
        ADD_PARALYZED_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
        ADD_POISON_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
      }
      effect.player.marker.addMarker(this.NEEDLE_SHOCK_MARKER, this);
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.CLEAR_NEEDLE_SHOCK_MARKER, this)) {
      effect.player.marker.removeMarker(this.NEEDLE_SHOCK_MARKER, this);
      effect.player.marker.removeMarker(this.CLEAR_NEEDLE_SHOCK_MARKER, this);
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.NEEDLE_SHOCK_MARKER, this)) {
      effect.player.marker.addMarker(this.CLEAR_NEEDLE_SHOCK_MARKER, this);
    }

    return state;
  }
}

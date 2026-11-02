import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, SpecialCondition, Stage } from '../../../game/store/card/card-types';
import { PlayerType, PokemonCardList, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { KNOCK_OUT_OPPONENTS_ACTIVE_POKEMON, YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP } from '../../../game/store/prefabs/attack-effects';
import { ADD_MARKER, HAS_MARKER, REMOVE_MARKER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Altaria extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Swablu';
  public hp: number = 90;
  public cardType: CardType[] = [C];
  public weakness = [{ type: L, value: +20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Midnight Eyes',
    cost: [C],
    damage: 20,
    text: 'The Defending Pokémon is now Asleep.'
  }, {
    name: 'Perish Song',
    cost: [C, C],
    damage: 0,
    text: 'If the Defending Pokémon is Asleep and was damaged or affected by Midnight Eyes during your last turn, the Defending Pokémon is Knocked Out.'
  }, {
    name: 'Healing Song',
    cost: [C, C],
    damage: 40,
    text: 'Remove 1 damage counter from each of your Pokémon.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '18';
  public name: string = 'Altaria';
  public fullName: string = 'Altaria PL';

  public readonly MIDNIGHT_EYES_MARKER = 'MIDNIGHT_EYES_MARKER';
  public readonly MIDNIGHT_EYES_CLEAR_MARKER = 'MIDNIGHT_EYES_CLEAR_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Midnight Eyes
    if (WAS_ATTACK_USED(effect, 0, this)) {
      YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_ASLEEP(store, state, effect);
      ADD_MARKER(this.MIDNIGHT_EYES_MARKER, effect.opponent.active, this);
      REMOVE_MARKER(this.MIDNIGHT_EYES_CLEAR_MARKER, effect.player, this);
      ADD_MARKER(this.MIDNIGHT_EYES_MARKER, effect.player, this);
    }

    // Perish Song
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const defending = effect.opponent.active;
      if (
        defending.specialConditions.includes(SpecialCondition.ASLEEP) &&
        HAS_MARKER(this.MIDNIGHT_EYES_MARKER, defending, this)
      ) {
        KNOCK_OUT_OPPONENTS_ACTIVE_POKEMON(store, state, effect);
      }
    }

    // Healing Song
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList: PokemonCardList) => {
        const healEffect = new HealEffect(player, cardList, 10);
        store.reduceEffect(state, healEffect);
      });
    }

    // Keep Midnight Eyes until the end of your next turn
    if (effect instanceof EndTurnEffect && HAS_MARKER(this.MIDNIGHT_EYES_MARKER, effect.player, this)) {
      if (HAS_MARKER(this.MIDNIGHT_EYES_CLEAR_MARKER, effect.player, this)) {
        const opponent = StateUtils.getOpponent(state, effect.player);
        opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
          REMOVE_MARKER(this.MIDNIGHT_EYES_MARKER, cardList, this);
        });
        REMOVE_MARKER(this.MIDNIGHT_EYES_MARKER, effect.player, this);
        REMOVE_MARKER(this.MIDNIGHT_EYES_CLEAR_MARKER, effect.player, this);
      } else {
        ADD_MARKER(this.MIDNIGHT_EYES_CLEAR_MARKER, effect.player, this);
      }
    }

    return state;
  }
}

import { ConfirmPrompt, GameMessage, PowerType } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import {IS_ABILITY_BLOCKED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Garchomp extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Gabite';
  public cardType: CardType[] = [N];
  public hp: number = 160;
  public retreat = [C];

  public powers = [{
    name: 'Sonic Slip',
    powerType: PowerType.ABILITY,
    text: 'When you play this Pokémon from your hand to evolve 1 of your Pokémon during your turn, you may prevent all damage from and effects of attacks done to this Pokémon until the end of your opponent\'s next turn.'
  }];

  public attacks = [{
    name: 'Dragonblade',
    cost: [W, F],
    damage: 160,
    text: 'Discard the top 2 cards of your deck.'
  }];

  public regulationMark = 'F';
  public set: string = 'BRS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '109';
  public name: string = 'Garchomp';
  public fullName: string = 'Garchomp BRS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Dragonblade
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      MOVE_CARDS(store, state, player.deck, player.discard, { count: 2, sourceCard: this });
      return state;
    }

    // Sonic Slip
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }
      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {
          player.active.preventDamageNextTurnPending = {};
          player.active.preventEffectsOfAttacksNextTurnPending = {};
        }
      });
      return state;
    }

    return state;
  }
} 

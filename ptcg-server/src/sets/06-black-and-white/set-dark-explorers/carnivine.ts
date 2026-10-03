import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, ChoosePokemonPrompt, GameMessage, StateUtils, PlayerType, SlotType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, ADD_POISON_TO_PLAYER_ACTIVE, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { AfterAttackEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';

export class Carnivine extends PokemonCard {

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [G];

  public hp: number = 90;

  public weakness = [{ type: R }];

  public resistance = [{ type: W, value: -20 }];

  public retreat = [C, C];

  public attacks = [
    {
      name: 'Lure Poison',
      cost: [G],
      damage: 0,
      text: 'Switch the Defending Pokémon with 1 of your opponent\'s Benched Pokémon. The new Defending Pokémon is now Poisoned.'
    },
    {
      name: 'Spit Squall',
      cost: [G, G, C],
      damage: 0,
      text: 'Your opponent puts the Defending Pokémon and all cards attached to it into his or her hand.'
    }
  ];

  public set: string = 'DEX';

  public setNumber: string = '5';

  public cardImage: string = 'assets/cardback.png';

  public name: string = 'Carnivine';

  public fullName: string = 'Carnivine DEX';

  private usedLurePoison: boolean = false;
  private usedSpitSquall: boolean = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Lure Poison - set flag during attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.usedLurePoison = true;
    }

    // Spit Squall - set flag during attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      this.usedSpitSquall = true;
    }

    // After Lure Poison - switch then poison
    if (effect instanceof AfterAttackEffect && this.usedLurePoison) {
      this.usedLurePoison = false;
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasBenched = opponent.bench.some(b => b.cards.length > 0);

      if (!hasBenched) {
        // No benched Pokémon to switch, just poison the current active
        ADD_POISON_TO_PLAYER_ACTIVE(store, state, opponent, this);
        return state;
      }

      // Switch opponent's active with a benched Pokémon
      store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_SWITCH,
        PlayerType.TOP_PLAYER,
        [SlotType.BENCH],
        { allowCancel: false }
      ), selected => {
        if (!selected || selected.length === 0) {
          return state;
        }
        const target = selected[0];
        opponent.switchPokemon(target);
        // Poison the new active Pokémon
        ADD_POISON_TO_PLAYER_ACTIVE(store, state, opponent, this);
      });
    }

    // After Spit Squall - return defending Pokémon to hand
    if (effect instanceof AfterAttackEffect && this.usedSpitSquall) {
      this.usedSpitSquall = false;
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const defendingPokemon = opponent.active;

      // Move the defending Pokémon and all attached cards to opponent's hand
      MOVE_CARDS(store, state, defendingPokemon, opponent.hand, { sourceCard: this });
      defendingPokemon.clearEffects();
    }

    // Cleanup flags at end of turn
    if (effect instanceof EndTurnEffect) {
      this.usedLurePoison = false;
      this.usedSpitSquall = false;
    }

    return state;
  }

}

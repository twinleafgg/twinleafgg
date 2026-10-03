import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, PlayerType, SlotType, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import { AfterAttackEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Pidgeot extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Pidgeotto';
  public cardType: CardType[] = [CardType.COLORLESS];
  public hp: number = 130;
  public weakness = [{ type: CardType.LIGHTNING }];
  public resistance = [{ type: CardType.FIGHTING, value: -20 }];
  public retreat: CardType[] = [];

  public attacks = [
    {
      name: 'Whirlwind',
      cost: [CardType.COLORLESS, CardType.COLORLESS],
      damage: 60,
      text: 'Your opponent switches their Active Pokémon with 1 of their Benched Pokémon.'
    },
    {
      name: 'Spin Storm',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 0,
      text: 'Your opponent puts their Active Pokémon and all cards attached to it into their hand.'
    }
  ];

  public set: string = 'TEU';
  public setNumber: string = '124';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Pidgeot';
  public fullName: string = 'Pidgeot TEU';

  public usedWhirlwind = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Whirlwind
    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.usedWhirlwind = true;
    }

    if (effect instanceof AfterAttackEffect && this.usedWhirlwind === true) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const benched = opponent.bench.filter(b => b.cards.length > 0);
      if (benched.length === 0) {
        return state;
      }
      state = store.prompt(state, new ChoosePokemonPrompt(
        opponent.id,
        GameMessage.CHOOSE_POKEMON_TO_SWITCH,
        PlayerType.TOP_PLAYER,
        [SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), targets => {
        this.usedWhirlwind = false;
        if (!targets || targets.length === 0) {
          return;
        }
        // Use switchPokemon method for switching
        opponent.switchPokemon(targets[0]);
      });
      return state;
    }
    // Spin Storm
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;
      const active = opponent.active;
      if (active.cards.length > 0) {
        MOVE_CARDS(store, state, opponent.hand, opponent.hand, { cards: active.cards.slice(), sourceCard: this });
        active.cards = [];
      }
      return state;
    }
    return state;
  }
}

import {
  Attack,
  CardTarget,
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  PlayerType,
  SlotType,
  StateUtils,
} from '../../../game';
import { CardType, TrainerType } from '../../../game/store/card/card-types';
import { ColorlessCostReducer } from '../../../game/store/card/pokemon-interface';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import {
  CheckAttackCostEffect,
  CheckPokemonAttacksEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {DAMAGE_OPPONENT_POKEMON, IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class TechnicalMachineBlindside extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public regulationMark = 'G';

  protected _tags = [];

  public set: string = 'PAR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '176';

  public name: string = 'Technical Machine: Blindside';

  public fullName: string = 'Technical Machine: Blindside PAR';

  public attacks: Attack[] = [
    {
      name: 'Blindside',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 0,
      text: "This attack does 100 damage to 1 of your opponent's Pokémon that has any damage counters on it. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public text: string =
    'The Pokémon this card is attached to can use the attack on this card. (You still need the necessary Energy to use this attack.) If this card is attached to 1 of your Pokémon, discard it at the end of your turn.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof CheckAttackCostEffect && effect.attack === this.attacks[0]) {
      const pokemonCard = effect.player.active.getPokemonCard();
      if (pokemonCard && 'getColorlessReduction' in pokemonCard) {
        const reduction = (pokemonCard as ColorlessCostReducer).getColorlessReduction(state);
        for (let i = 0; i < reduction && effect.cost.includes(CardType.COLORLESS); i++) {
          const index = effect.cost.indexOf(CardType.COLORLESS);
          if (index !== -1) {
            effect.cost.splice(index, 1);
          }
        }
      }
    }

    if (
      effect instanceof CheckPokemonAttacksEffect &&
      effect.player.active.cards.includes(this) &&
      !effect.attacks.includes(this.attacks[0])
    ) {
      effect.attacks.push(this.attacks[0]);
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;

      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        return state;
      }

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, index) => {
        if (cardList.tools && cardList.tools.includes(this)) {
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
        }
      });
      return state;
    }

    if (effect instanceof AttackEffect && effect.attack === this.attacks[0]) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      const blocked: CardTarget[] = [];

      let hasDamagedPokemon = false;

      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (cardList.damage > 0) {
          hasDamagedPokemon = true;
        } else {
          blocked.push(target);
        }
      });

      if (!hasDamagedPokemon) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const hasBenched = opponent.bench.some((b) => b.cards.length > 0);
      if (!hasBenched && opponent.active.damage > 0) {
        effect.damage = 100;
      }

      state = store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { min: 1, max: 1, allowCancel: false, blocked: blocked },
        ),
        (selected) => {
          const targets = selected || [];
          DAMAGE_OPPONENT_POKEMON(store, state, effect, 100, targets);
        },
      );
    }

    return state;
  }
}

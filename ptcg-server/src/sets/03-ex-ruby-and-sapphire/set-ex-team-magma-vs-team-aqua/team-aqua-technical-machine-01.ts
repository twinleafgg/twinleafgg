import {
  Attack,
  CardTarget,
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  PlayerType,
  SelectPrompt,
  SlotType,
} from '../../../game';
import {
  CardTag,
  CardType,
  SpecialCondition,
  TrainerType,
} from '../../../game/store/card/card-types';
import { ColorlessCostReducer } from '../../../game/store/card/pokemon-interface';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import {
  CheckAttackCostEffect,
  CheckPokemonAttacksEffect,
  CheckTableStateEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TeamAquaTechnicalMachine01 extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags = [CardTag.TECHNICAL_MACHINE];
  public set: string = 'MA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '79';
  public name: string = 'Team Aqua Technical Machine 01';
  public fullName: string = 'Team Aqua Technichal Machine 01 MA';

  public attacks: Attack[] = [
    {
      name: 'Miracle',
      cost: [C],
      damage: 10,
      text: 'Choose 1 Special Condition. The Defending Pokémon is now affected by that Special Condition.',
    },
  ];

  public text: string =
    "Attach this card to 1 of your Pokémon that has Team Aqua in its name. That Pokémon may use this card's attack instead of its own. At the end of your turn, discard Team Aqua Technical Machine 01.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      // Find slots to attach TM
      const blocked: CardTarget[] = [];
      let eligibleCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, index) => {
        if (!card.hasTag(CardTag.TEAM_AQUA)) {
          blocked.push(index);
        } else {
          eligibleCount++;
        }
      });

      // Error if no slots
      if (eligibleCount === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      state = store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { min: 1, max: 1, allowCancel: false, blocked },
        ),
        (transfers) => {
          MOVE_CARDS(store, state, player.supporter, transfers[0], { cards: [effect.trainerCard], sourceCard: this });
        },
      );
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, index) => {
        if (cardList.cards.includes(this)) {
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
        }
      });
    }

    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach((player) => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (!cardList.cards.includes(this)) {
            return;
          }

          const attachedTo = cardList.getPokemonCard();

          if (!!attachedTo && !attachedTo.hasTag(CardTag.TEAM_AQUA)) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      });
    }

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

    if (effect instanceof AttackEffect && effect.attack === this.attacks[0]) {
      const player = effect.player;

      const options: { message: GameMessage; value: SpecialCondition }[] = [
        { message: GameMessage.SPECIAL_CONDITION_PARALYZED, value: SpecialCondition.PARALYZED },
        { message: GameMessage.SPECIAL_CONDITION_CONFUSED, value: SpecialCondition.CONFUSED },
        { message: GameMessage.SPECIAL_CONDITION_ASLEEP, value: SpecialCondition.ASLEEP },
        { message: GameMessage.SPECIAL_CONDITION_POISONED, value: SpecialCondition.POISONED },
        { message: GameMessage.SPECIAL_CONDITION_BURNED, value: SpecialCondition.BURNED },
      ];

      return store.prompt(
        state,
        new SelectPrompt(
          player.id,
          GameMessage.CHOOSE_SPECIAL_CONDITION,
          options.map((c) => c.message),
          { allowCancel: false },
        ),
        (choice) => {
          const option = options[choice];

          if (option !== undefined) {
            const specialConditionEffect = new AddSpecialConditionsEffect(effect, [option.value]);
            store.reduceEffect(state, specialConditionEffect);
          }
        },
      );
    }

    return state;
  }
}

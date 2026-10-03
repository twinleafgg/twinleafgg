import {
  Attack,
  CardTarget,
  ChoosePokemonPrompt,
  GameMessage,
  PlayerType,
  SlotType,
} from '../../game';
import { CardTag, CardType, TrainerType } from '../../game/store/card/card-types';
import { ColorlessCostReducer } from '../../game/store/card/pokemon-interface';
import { TrainerCard } from '../../game/store/card/trainer-card';
import {
  CheckAttackCostEffect,
  CheckPokemonAttacksEffect,
} from '../../game/store/effects/check-effects';
import { Effect } from '../../game/store/effects/effect';
import { AttackEffect } from '../../game/store/effects/game-effects';

import { EndTurnEffect } from '../../game/store/effects/game-phase-effects';
import {
  DEVOLVE_POKEMON,
  DRAW_CARDS,
  MOVE_CARDS,
  SHUFFLE_DECK,
} from '../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';

export class MysteryPlateGamma extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags = [CardTag.TECHNICAL_MACHINE];
  public set: string = 'SK';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '135';
  public name: string = 'Mystery Plate γ';
  public fullName: string = 'Mystery Plate γ SK';

  public attacks: Attack[] = [
    {
      name: 'Retro Cave',
      cost: [C],
      damage: 0,
      text: "If your opponent has 5 or more Prizes, shuffle your hand into your deck and then draw 6 cards. If your opponent has exactly 2 Prizes, choose 1 of your opponent's Evolved Pokémon. Your opponent puts the top card on that Evolved Pokémon on the bottom of his or her deck. (This counts as devolving that Pokémon.)",
    },
  ];

  public text: string =
    "Attach this card to 1 of your Pokémon in play. That Pokémon may use this card's attack instead of its own. At the end of your turn, discard Mystery Plate γ.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      state = store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { min: 1, max: 1, allowCancel: false },
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
      const opponent = effect.opponent;

      if (opponent.getPrizeLeft() >= 5) {
        MOVE_CARDS(store, state, player.hand, player.deck, { cards: player.hand.cards });
        SHUFFLE_DECK(store, state, player);
        DRAW_CARDS(store, state, player, 6);
      } else if (opponent.getPrizeLeft() === 2) {
        let canDevolve = false;
        const blocked: CardTarget[] = [];
        effect.opponent.forEachPokemon(PlayerType.TOP_PLAYER, (list, card, target) => {
          if (list.getPokemons().length > 1) {
            canDevolve = true;
          } else {
            blocked.push(target);
          }
        });

        if (!canDevolve) {
          return state;
        }

        return store.prompt(
          state,
          new ChoosePokemonPrompt(
            effect.player.id,
            GameMessage.CHOOSE_POKEMON,
            PlayerType.TOP_PLAYER,
            [SlotType.ACTIVE, SlotType.BENCH],
            { allowCancel: false, min: 1, max: 1, blocked },
          ),
          (results) => {
            if (results && results.length > 0) {
              DEVOLVE_POKEMON(store, state, results[0], effect.opponent.deck);
            }

            return state;
          },
        );
      }
    }

    return state;
  }
}

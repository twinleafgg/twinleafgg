import {
  Attack,
  CardTarget,
  ChooseCardsPrompt,
  ChoosePokemonPrompt,
  GameMessage,
  PlayerType,
  PokemonCardList,
  SlotType,
} from '../../game';
import {
  CardTag,
  CardType,
  EnergyType,
  SuperType,
  TrainerType,
} from '../../game/store/card/card-types';
import { ColorlessCostReducer } from '../../game/store/card/pokemon-interface';
import { TrainerCard } from '../../game/store/card/trainer-card';
import {
  CheckAttackCostEffect,
  CheckPokemonAttacksEffect,
} from '../../game/store/effects/check-effects';
import { Effect } from '../../game/store/effects/effect';
import { AttackEffect, HealEffect } from '../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../game/store/effects/game-phase-effects';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK } from '../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../game/store/prefabs/trainer-prefabs';
import { State } from '../../game/store/state/state';
import { StoreLike } from '../../game/store/store-like';

export class MysteryPlateDelta extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags = [CardTag.TECHNICAL_MACHINE];
  public set: string = 'SK';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '136';
  public name: string = 'Mystery Plate δ';
  public fullName: string = 'Mystery Plate δ SK';

  public attacks: Attack[] = [
    {
      name: 'Healing Oasis',
      cost: [C],
      damage: 0,
      text: 'If your opponent has 5 or more Prizes, search your deck for up to 3 basic Energy cards, show them to your opponent, and put them into your hand. Shuffle your deck afterward. If your opponent has exactly 2 Prizes, remove all damage counters from 1 of your Pokémon.',
    },
  ];

  public text: string =
    "Attach this card to 1 of your Pokémon in play. That Pokémon may use this card's attack instead of its own. At the end of your turn, discard Mystery Plate δ.";

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
        store.prompt(
          state,
          new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_HAND,
            player.deck,
            { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
            { min: 0, max: 3, allowCancel: false },
          ),
          (selected) => {
            if (selected) {
              SHOW_CARDS_TO_PLAYER(store, state, opponent, selected);
              MOVE_CARDS(store, state, player.deck, player.hand, { cards: selected });
              SHUFFLE_DECK(store, state, player);
            }
          },
        );
      } else if (opponent.getPrizeLeft() === 2) {
        const blocked: CardTarget[] = [];
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
          if (cardList.damage === 0) {
            blocked.push(target);
          }
        });

        let targets: PokemonCardList[] = [];
        return store.prompt(
          state,
          new ChoosePokemonPrompt(
            player.id,
            GameMessage.CHOOSE_POKEMON_TO_HEAL,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.ACTIVE, SlotType.BENCH],
            { min: 0, max: 1, allowCancel: false, blocked },
          ),
          (results) => {
            targets = results || [];
            if (targets.length === 0) {
              return state;
            }

            targets.forEach((target) => {
              // Heal Pokemon
              const healEffect = new HealEffect(player, target, 999);
              store.reduceEffect(state, healEffect);
            });
          },
        );
      }
    }

    return state;
  }
}

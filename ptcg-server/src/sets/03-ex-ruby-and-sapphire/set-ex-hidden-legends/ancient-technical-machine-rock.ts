import {
  Attack,
  CardManager,
  CardTarget,
  ChoosePokemonPrompt,
  GameError,
  GameMessage,
  PlayerType,
  PokemonCard,
  SlotType,
  StateUtils,
} from '../../../game';
import {
  CardTag,
  CardType,
  Stage,
  SuperType,
  TrainerType,
} from '../../../game/store/card/card-types';
import { ColorlessCostReducer } from '../../../game/store/card/pokemon-interface';
import { TrainerCard } from '../../../game/store/card/trainer-card';
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

export class AncientTechnicalMachineRock extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags = [CardTag.TECHNICAL_MACHINE];
  public set: string = 'HL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '85';
  public name: string = 'Ancient Technical Machine [Rock]';
  public fullName: string = 'Ancient Technical Machine [Rock] HL';

  public attacks: Attack[] = [
    {
      name: 'Stone Generator',
      cost: [C],
      damage: 0,
      text: 'If your opponent has any Evolved Pokémon in play, remove the highest Stage Evolution card from each of them and put those cards back into his or her hand.',
    },
  ];

  public text: string =
    "Attach this card to 1 of your Evolved Pokémon (excluding Pokémon-ex and Pokémon that has an owner in its name) in play. That Pokémon may use this card's attack instead of its own. At the end of your turn, discard Ancient Technical Machine [Rock].";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;

      // Find slots to attach TM
      const blocked: CardTarget[] = [];
      let eligibleCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, index) => {
        if (cardList.getPokemons().length < 2 || card.hasTag(CardTag.POKEMON_ex)) {
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

          if (
            !!attachedTo &&
            (attachedTo.hasTag(CardTag.POKEMON_ex) || cardList.getPokemons().length < 2)
          ) {
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
      const opponent = StateUtils.getOpponent(state, player);

      // Look through all known cards to find out if Pokemon can evolve
      const cm = CardManager.getInstance();
      const evolutions = cm.getAllCards().filter((c) => {
        return c instanceof PokemonCard && c.stage !== Stage.BASIC;
      }) as PokemonCard[];

      // Build possible evolution card names
      const evolutionNames: string[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (list, card, target) => {
        const valid = evolutions.filter((e) => e.evolvesFrom === card.name);
        valid.forEach((c) => {
          if (!evolutionNames.includes(c.name)) {
            evolutionNames.push(c.name);
          }
        });
      });

      if (opponent.active.getPokemonCard()) {
        const activePokemon = opponent.active.cards.filter(
          (card) => card.superType === SuperType.POKEMON,
        );
        if (activePokemon.length > 0) {
          let lastPlayedPokemonIndex = activePokemon.length - 1;
          while (
            lastPlayedPokemonIndex >= 0 &&
            activePokemon[lastPlayedPokemonIndex] instanceof PokemonCard &&
            (activePokemon[lastPlayedPokemonIndex] as PokemonCard).stage === Stage.BASIC
          ) {
            lastPlayedPokemonIndex--;
          }
          if (lastPlayedPokemonIndex >= 0) {
            const lastPlayedPokemon = activePokemon[lastPlayedPokemonIndex];
            MOVE_CARDS(store, state, opponent.active, opponent.hand, { cards: [lastPlayedPokemon], sourceCard: this });
          }
        }
      }

      opponent.bench.forEach((benchSpot) => {
        if (benchSpot.getPokemonCard()) {
          const benchPokemon = benchSpot.cards.filter(
            (card) => card.superType === SuperType.POKEMON,
          );
          if (benchPokemon.length > 0) {
            let lastPlayedPokemonIndex = benchPokemon.length - 1;
            while (
              lastPlayedPokemonIndex >= 0 &&
              benchPokemon[lastPlayedPokemonIndex] instanceof PokemonCard &&
              (benchPokemon[lastPlayedPokemonIndex] as PokemonCard).stage === Stage.BASIC
            ) {
              lastPlayedPokemonIndex--;
            }
            if (lastPlayedPokemonIndex >= 0) {
              const lastPlayedPokemon = benchPokemon[lastPlayedPokemonIndex];
              MOVE_CARDS(store, state, benchSpot, opponent.hand, { cards: [lastPlayedPokemon], sourceCard: this });
            }
          }
        }
      });
    }

    return state;
  }
}

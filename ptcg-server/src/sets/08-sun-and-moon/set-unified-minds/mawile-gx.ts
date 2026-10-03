import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  TrainerType,
} from '../../../game/store/card/card-types';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {
  PowerType,
  StoreLike,
  State,
  TrainerCard,
  GameMessage,
  PokemonCardList,
  StateUtils,
  ChooseCardsPrompt,
} from '../../../game';
import {
  ABILITY_USED,
  BLOCK_IF_GX_ATTACK_USED,
  CONFIRMATION_PROMPT,
  IS_ABILITY_BLOCKED,
  MOVE_CARDS,
  SHOW_CARDS_TO_PLAYER,
  WAS_ATTACK_USED,
} from '../../../game/store/prefabs/prefabs';

export class MawileGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [M];
  public hp: number = 170;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C];

  public powers = [
    {
      name: 'Captivating Wink',
      powerType: PowerType.ABILITY,
      text: 'When you play this Pokémon from your hand onto your Bench during your turn, you may have your opponent reveal their hand and put any number of Basic Pokémon you find there onto their Bench.',
    },
  ];

  public attacks = [
    {
      name: 'Wily Bite',
      cost: [M, C],
      damage: 10,
      damageCalculation: '+',
      text: "This attack does 30 more damage for each of your opponent's Benched Pokémon.",
    },
    {
      name: 'Big Eater-GX',
      cost: [M, C],
      damage: 0,
      gxAttack: true,
      text: "Your opponent reveals their hand. Discard all Supporter cards you find there. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'UNM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '141';
  public name: string = 'Mawile-GX';
  public fullName: string = 'Mawile-GX UNM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      CONFIRMATION_PROMPT(
        store,
        state,
        player,
        (result) => {
          if (result) {
            const player = effect.player;
            const opponent = StateUtils.getOpponent(state, player);
            const slots: PokemonCardList[] = opponent.bench.filter((b) => b.cards.length === 0);

            ABILITY_USED(player, this);

            if (slots.length === 0) {
              // No open slots, do nothing
              return state;
            }

            if (opponent.hand.cards.length === 0) {
              return state;
            }

            const max = Math.min(
              opponent.hand.cards.filter(
                (card) => card instanceof PokemonCard && card.stage === Stage.BASIC,
              ).length,
              slots.length,
            );

            store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_BASIC_POKEMON_TO_BENCH,
                opponent.hand,
                { superType: SuperType.POKEMON, stage: Stage.BASIC },
                { min: 0, max, allowCancel: true },
              ),
              (selected) => {
                const cards = selected || [];

                // Operation canceled by the user
                if (cards.length === 0) {
                  return state;
                }

                cards.forEach((card, index) => {
                  MOVE_CARDS(store, state, opponent.hand, slots[index], { cards: [card], sourceCard: this });
                  slots[index].pokemonPlayedTurn = state.turn;
                });
              },
            );
          }
        },
        GameMessage.WANT_TO_USE_ABILITY,
      );
    }

    // Wily Bite
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      const opponentBench = opponent.bench.reduce((left, b) => left + (b.cards.length ? 1 : 0), 0);
      effect.damage += 30 * opponentBench;
    }

    // Big Eater-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Check if player has used GX attack
      BLOCK_IF_GX_ATTACK_USED(player);
      // set GX attack as used for game
      player.usedGX = true;

      // Create a copy of the opponent's hand to show before moving cards
      const opponentHandCopy = [...opponent.hand.cards];
      SHOW_CARDS_TO_PLAYER(store, state, player, opponentHandCopy);

      const supporterCards = opponent.hand.cards.filter(
        (card) => card instanceof TrainerCard && card.trainerType === TrainerType.SUPPORTER,
      );
      MOVE_CARDS(store, state, opponent.hand, opponent.discard, {
        cards: supporterCards,
        sourceCard: this,
        sourceEffect: this.attacks[1],
      });
    }

    return state;
  }
}

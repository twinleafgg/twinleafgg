import { HealEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  TrainerType,
  BoardEffect,
} from '../../../game/store/card/card-types';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {
  PowerType,
  StoreLike,
  State,
  GameMessage,
  ChooseCardsPrompt,
  ConfirmPrompt,
  ShowCardsPrompt,
  StateUtils,
  GameLog,
  PlayerType,
  CardTarget,
  ChoosePokemonPrompt,
  GameError,
  PokemonCardList,
  SlotType,
  ShuffleDeckPrompt,
} from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {BLOCK_IF_GX_ATTACK_USED,
  IS_ABILITY_BLOCKED,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TapuLeleGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 170;

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Wonder Tag',
      powerType: PowerType.ABILITY,
      text: 'When you play this Pokémon from your hand onto your Bench during your turn, you may search your deck for a Supporter card, reveal it, and put it into your hand. Then, shuffle your deck.',
    },
  ];

  public attacks = [
    {
      name: 'Energy Drive',
      cost: [CardType.COLORLESS, CardType.COLORLESS],
      damage: 20,
      damageCalculation: 'x',
      text: "This attack does 20 damage times the amount of Energy attached to both Active Pokémon. This damage isn't affected by Weakness or Resistance.",
    },
    {
      name: 'Tapu Cure-GX',
      cost: [CardType.PSYCHIC],
      damage: 0,
      gxAttack: true,
      text: "Heal all damage from 2 of your Benched Pokémon. (You can't use more than 1 GX attack in a game.) ",
    },
  ];

  public set: string = 'GRI';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '60';

  public name: string = 'Tapu Lele-GX';

  public fullName: string = 'Tapu Lele-GX GRI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        return state;
      }

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }
      state = store.prompt(
        state,
        new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (wantToUse) {
            player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
              if (cardList.getPokemonCard() === this) {
                store.log(state, GameLog.LOG_PLAYER_USES_ABILITY, {
                  name: player.name,
                  ability: 'Wonder Tag',
                });
              }
            });

            state = store.prompt(
              state,
              new ChooseCardsPrompt(
                player,
                GameMessage.CHOOSE_CARD_TO_HAND,
                player.deck,
                { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
                { min: 0, max: 1, allowCancel: false },
              ),
              (selected) => {
                const cards = selected || [];
                if (cards.length > 0) {
                  store.prompt(
                    state,
                    [
                      new ShowCardsPrompt(
                        opponent.id,
                        GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
                        cards,
                      ),
                    ],
                    () => {
                      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
                        if (cardList.getPokemonCard() === this) {
                          cardList.addBoardEffect(BoardEffect.ABILITY_USED);
                        }
                      });

                      MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });
                    },
                  );
                  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                    player.deck.applyOrder(order);
                  });
                }
              },
            );
          }
        },
      );
    }

    // Energy Drive
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const playerProvidedEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, playerProvidedEnergy);
      const playerEnergyCount = playerProvidedEnergy.energyMap.reduce(
        (left, p) => left + p.provides.length,
        0,
      );

      const opponentProvidedEnergy = new CheckProvidedEnergyEffect(opponent);
      store.reduceEffect(state, opponentProvidedEnergy);
      const opponentEnergyCount = opponentProvidedEnergy.energyMap.reduce(
        (left, p) => left + p.provides.length,
        0,
      );

      effect.damage = (playerEnergyCount + opponentEnergyCount) * 20;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const blocked: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (cardList.damage === 0) {
          blocked.push(target);
        }
      });

      const hasPokeBenchWithDamage = player.bench.some((b) => b.damage > 0);
      const hasActiveWIthDamage = player.active.damage > 0;
      const pokemonInPlayWithDamage = hasPokeBenchWithDamage || hasActiveWIthDamage;

      if (!pokemonInPlayWithDamage) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      BLOCK_IF_GX_ATTACK_USED(player);
      let targets: PokemonCardList[] = [];
      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_HEAL,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 2, allowCancel: false, blocked },
        ),
        (results) => {
          targets = results || [];
          if (targets.length === 0) {
            return state;
          }
          player.usedGX = true;
          targets.forEach((target) => {
            // Heal Pokemon
            const healEffect = new HealEffect(player, target, 999);
            store.reduceEffect(state, healEffect);
          });

          return state;
        },
      );
    }

    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  SuperType,
  CardTag,
  EnergyType,
  BoardEffect,
} from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  StateUtils,
  GameError,
  GameMessage,
  PlayerType,
  ConfirmPrompt,
  AttachEnergyPrompt,
  CardTarget,
  SlotType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {
  BLOCK_IF_GX_ATTACK_USED,
  IS_ABILITY_BLOCKED,
  MOVE_CARDS,
  WAS_ATTACK_USED,
} from '../../../game/store/prefabs/prefabs';

// CES Rayquaza-GX 109 (https://limitlesstcg.com/cards/CES/109)
export class RayquazaGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.DRAGON];

  public hp: number = 180;

  public weakness = [{ type: CardType.FAIRY }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Stormy Winds',
      useWhenInPlay: false,
      powerType: PowerType.ABILITY,
      text: 'When you play this Pokémon from your hand onto your Bench during your turn, you may discard the top 3 cards of your deck. If you do, attach a basic Energy card from your discard pile to this Pokémon.',
    },
  ];

  public attacks = [
    {
      name: 'Dragon Break',
      cost: [CardType.GRASS, CardType.LIGHTNING, CardType.COLORLESS],
      damage: 30,
      text: 'This attack does 30 damage times the amount of basic [G] and basic [L] Energy attached to your Pokémon.',
    },

    {
      name: 'Tempest-GX',
      cost: [CardType.GRASS],
      damage: 0,
      gxAttack: true,
      text: "Discard your hand and draw 10 cards. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'CES';

  public name: string = 'Rayquaza-GX';

  public fullName: string = 'Rayquaza-GX CES';

  public setNumber: string = '109';

  public cardImage: string = 'assets/cardback.png';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Stormy Winds
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      // Check if there's any basic energy in the discard pile
      const hasBasicEnergyInDiscard = player.discard.cards.some(
        (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC,
      );

      if (!hasBasicEnergyInDiscard) {
        return state;
      }

      if (hasBasicEnergyInDiscard) {
        state = store.prompt(
          state,
          new ConfirmPrompt(player.id, GameMessage.WANT_TO_USE_ABILITY),
          (wantToUse) => {
            if (wantToUse) {
              // Discard top 3 cards from the deck
              MOVE_CARDS(store, state, player.deck, player.discard, { count: 3, sourceCard: this });

              const blockedTo: CardTarget[] = [];
              player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
                if (card !== this) {
                  blockedTo.push(target);
                }
              });

              // Prompt to attach 1 basic energy from discard
              state = store.prompt(
                state,
                new AttachEnergyPrompt(
                  player.id,
                  GameMessage.ATTACH_ENERGY_TO_BENCH,
                  player.discard,
                  PlayerType.BOTTOM_PLAYER,
                  [SlotType.ACTIVE, SlotType.BENCH],
                  { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
                  { allowCancel: false, min: 1, max: 1, blockedTo, sameTarget: true },
                ),
                (transfers) => {
                  transfers = transfers || [];

                  if (transfers.length === 0) {
                    return;
                  }

                  player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
                    if (cardList.getPokemonCard() === this) {
                      cardList.addBoardEffect(BoardEffect.ABILITY_USED);
                    }
                  });

                  for (const transfer of transfers) {
                    const target = StateUtils.getTarget(state, player, transfer.to);
                    MOVE_CARDS(store, state, player.discard, target, {
                      cards: [transfer.card],
                      sourceCard: this,
                      sourceEffect: this.powers[0],
                    });
                  }
                },
              );
            }
          },
        );
      }
    }

    // Dragon Break
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let grassAndLightningEnergies = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergyEffect);
        checkProvidedEnergyEffect.energyMap.forEach((energy) => {
          if (
            energy.provides.includes(CardType.GRASS) ||
            energy.provides.includes(CardType.LIGHTNING)
          ) {
            grassAndLightningEnergies += 1;
          }
        });
      });

      effect.damage = grassAndLightningEnergies * 30;
    }

    // Tempest-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      // Check if player has used GX attack
      BLOCK_IF_GX_ATTACK_USED(player);
      // set GX attack as used for game
      player.usedGX = true;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const cards = player.hand.cards.filter((c) => c !== this);
      MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
      MOVE_CARDS(store, state, player.deck, player.hand, { count: 10, sourceCard: this });
    }
    return state;
  }
}

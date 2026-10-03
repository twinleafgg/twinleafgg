import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt,
  Card,
  CardTarget,
  ChooseCardsPrompt,
  EnergyCard,
  GameError,
  GameMessage,
  PlayerType,
  PokemonCardList,
  SlotType,
  State,
  StateUtils,
  StoreLike, pokemonHasCardType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class GreninjaAndZoroarkGX extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_GX, CardTag.TAG_TEAM];
  public cardType: CardType[] = [D];
  public hp: number = 250;
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Dark Pulse',
      cost: [D, C],
      damage: 30,
      damageCalculation: '+',
      text: 'This attack does 30 more damage times the amount of [D] Energy attached to all of your Pokémon.',
    },
    {
      name: 'Dark Union-GX',
      cost: [D, C],
      damage: 0,
      text: "Put 2 in any combination of [D] Pokémon-GX and [D] Pokémon-EX from your discard pile onto your Bench. If this Pokémon has at least 1 extra Energy attached to it (in addition to this attack's cost), attach 2 Energy cards from your discard pile to each Pokémon that you put onto your Bench in this way. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'UNB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '107';
  public name: string = 'Greninja & Zoroark-GX';
  public fullName: string = 'Greninja & Zoroark-GX UNB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Dark Pulse
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let darkEnergies = 0;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const darkEnergy = cardList.cards.filter(
          (card) => card instanceof EnergyCard && card.name === 'Darkness Energy',
        );
        darkEnergies += darkEnergy.length;
      });

      effect.damage += 30 * darkEnergies;
    }

    // Dark Union-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);
      if (slots.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      if (player.usedGX) {
        throw new GameError(GameMessage.LABEL_GX_USED);
      }
      player.usedGX = true;

      const unionBlocked: number[] = [];
      player.discard.cards.forEach((card, index) => {
        if (
          card instanceof PokemonCard &&
          !card.hasTag(CardTag.POKEMON_GX) &&
          !card.hasTag(CardTag.POKEMON_EX) &&
          !pokemonHasCardType(card, D)
        ) {
          unionBlocked.push(index);
        }
      });

      let cards: Card[] = [];
      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
          player.discard,
          { superType: SuperType.POKEMON },
          { min: 0, max: 2, allowCancel: false, blocked: unionBlocked },
        ),
        (selected) => {
          cards = selected || [];

          if (cards.length === 0) {
            return state;
          }

          cards.forEach((card, index) => {
            MOVE_CARDS(store, state, player.discard, slots[index], { cards: [card], sourceCard: this });
            slots[index].pokemonPlayedTurn = state.turn;
          });
        },
      );

      // Check for the extra energy cost.
      const extraEffectCost: CardType[] = [D, C, C];
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergy);
      const meetsExtraEffectCost = StateUtils.checkEnoughEnergy(
        checkProvidedEnergy.energyMap,
        extraEffectCost,
      );

      if (!meetsExtraEffectCost) {
        return state;
      } // If we don't have the extra energy, we just deal damage.
      // energy attachments
      const blockedTo: CardTarget[] = [];
      player.bench.forEach((bench, index) => {
        if (bench.cards.length === 0) {
          return;
        }

        const pokemonCard = bench.getPokemonCard();
        if (!!pokemonCard?.cards.cards && cards.includes(pokemonCard?.cards.cards[0])) {
          return;
        } else {
          const target: CardTarget = {
            player: PlayerType.BOTTOM_PLAYER,
            slot: SlotType.BENCH,
            index,
          };
          blockedTo.push(target);
        }
      });

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { allowCancel: false, differentTargets: true, min: 0, max: 2, blockedTo },
        ),
        (transfers) => {
          transfers = transfers || [];

          if (transfers.length === 0) {
            return;
          }

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    return state;
  }
}

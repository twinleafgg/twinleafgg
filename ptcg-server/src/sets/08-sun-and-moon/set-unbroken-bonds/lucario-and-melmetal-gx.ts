import { AttachEnergyPrompt, Card, CardTag, CardTarget, CardType, EnergyType, GameMessage, PlayerType, PokemonCard, SlotType, Stage, State, StateUtils, StoreLike, SuperType, pokemonHasCardTypeOptional } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { DealDamageEffect, DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import {AFTER_ATTACK,
  BLOCK_IF_GX_ATTACK_USED,
  SHUFFLE_DECK,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class LucarioMelmetalGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX, CardTag.TAG_TEAM];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [M];
  public hp: number = 260;
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Steel Fist',
      cost: [C, C],
      damage: 50,
      text: 'Search your deck for a [M] Energy card and attach it to this Pokémon. Then, shuffle your deck.',
    },
    {
      name: 'Heavy Impact',
      cost: [M, M, C, C],
      damage: 150,
      text: '',
    },
    {
      name: 'Full Metal Wall-GX',
      cost: [C],
      damage: 0,
      gxAttack: true,
      text: "For the rest of this game, your [M] Pokémon take 30 less damage from your opponent's attacks (after applying Weakness and Resistance). If this Pokémon has at least 1 extra Energy attached to it (in addition to this attack's cost), discard all Energy from your opponent's Active Pokémon. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set = 'UNB';
  public setNumber = '120';
  public cardImage = 'assets/cardback.png';
  public name = 'Lucario & Melmetal-GX';
  public fullName = 'Lucario & Melmetal-GX UNB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Steel Fist
    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;

      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (card !== this) {
          blockedTo.push(target);
        }
      });

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Metal Energy' },
          { min: 0, max: 1, allowCancel: false, blockedTo },
        ),
        (transfers) => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
          }
          SHUFFLE_DECK(store, state, player);
        },
      );
    }

    // Full Metal Wall-GX
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      player.usedFullMetalWall = true;

      const extraEffectCost: CardType[] = [C, C];
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergy);
      const meetsExtraEffectCost = StateUtils.checkEnoughEnergy(
        checkProvidedEnergy.energyMap,
        extraEffectCost,
      );

      if (meetsExtraEffectCost) {
        const opponentEnergy = new CheckProvidedEnergyEffect(opponent, opponent.active);
        state = store.reduceEffect(state, opponentEnergy);

        const oppCards: Card[] = [];
        opponentEnergy.energyMap.forEach((em) => {
          oppCards.push(em.card);
        });

        const discardEnergy2 = new DiscardCardsEffect(effect, oppCards);
        discardEnergy2.target = opponent.active;
        store.reduceEffect(state, discardEnergy2);
      }
    }

    if (
      effect instanceof DealDamageEffect &&
      pokemonHasCardTypeOptional(effect.target.getPokemonCard(), CardType.METAL) &&
      effect.opponent.usedFullMetalWall === true
    ) {
      effect.damage -= 30;
    }

    return state;
  }
}

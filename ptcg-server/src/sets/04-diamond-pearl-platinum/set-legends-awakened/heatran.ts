import { PokemonCard, Stage, CardType, PowerType, StoreLike, State, GameError, GameMessage, CardTarget, PlayerType, Card, MoveEnergyPrompt, SlotType, SuperType, StateUtils, ChooseCardsPrompt, EnergyType } from "../../../game";
import { DiscardCardsEffect } from "../../../game/store/effects/attack-effects";
import { CheckProvidedEnergyEffect } from "../../../game/store/effects/check-effects";
import { Effect } from "../../../game/store/effects/effect";
import {WAS_POWER_USED, HAS_MARKER, BLOCK_IF_HAS_SPECIAL_CONDITION, ADD_MARKER, ABILITY_USED, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class Heatran extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Flash Fire',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may move a Fire Energy attached to 1 of your Pokémon to Heatran. This power can\'t be used if Heatran is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Magma Storm',
    cost: [R, R, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'You may discard as many basic Energy cards as you like attached to Heatran. If you do, this attack does 40 damage plus 20 more damage for each Energy card you discarded.'
  }];

  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Heatran';
  public fullName: string = 'Heatran LA';

  public readonly FLASH_FIRE_MARKER = 'FLASH_FIRE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flash Fire
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (HAS_MARKER(this.FLASH_FIRE_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const blockedMap: { source: CardTarget; blocked: number[] }[] = [];
      const blockedTo: CardTarget[] = [];
      let hasFireEnergy = false;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (card !== this) {
          blockedTo.push(target);
        }

        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);
        const blockedCards: Card[] = [];
        checkProvidedEnergy.energyMap.forEach((em) => {
          if (!em.provides.includes(CardType.FIRE) && !em.provides.includes(CardType.ANY)) {
            blockedCards.push(em.card);
          } else {
            hasFireEnergy = true;
          }
        });
        const blocked: number[] = [];
        blockedCards.forEach((bc) => {
          const index = cardList.cards.indexOf(bc);
          if (index !== -1 && !blocked.includes(index)) {
            blocked.push(index);
          }
        });
        if (blocked.length !== 0) {
          blockedMap.push({ source: target, blocked });
        }
      });

      if (!hasFireEnergy) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      return store.prompt(
        state,
        new MoveEnergyPrompt(
          player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { min: 1, max: 1, allowCancel: true, blockedMap, blockedTo },
        ),
        (transfers) => {
          if (!transfers?.length) {
            return;
          }
          ADD_MARKER(this.FLASH_FIRE_MARKER, player, this);
          ABILITY_USED(player, this);
          for (const transfer of transfers) {
            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }
          return state;
        },
      );
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.FLASH_FIRE_MARKER, this);

    // Magma Storm
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let cards: Card[] = [];
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.active,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 0, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];
          if (cards.length > 0) {
            effect.damage += cards.length * 20;
            const discardEnergy = new DiscardCardsEffect(effect, cards);
            discardEnergy.target = player.active;
            store.reduceEffect(state, discardEnergy);
          }
          return state;
        },
      );
    }

    return state;
  }
}

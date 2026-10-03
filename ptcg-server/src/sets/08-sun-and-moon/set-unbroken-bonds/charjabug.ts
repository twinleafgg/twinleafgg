import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, PowerType, PlayerType, SlotType, GameError, GameMessage, ChoosePokemonPrompt, CardTarget, PokemonCardList, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class Charjabug extends PokemonCard implements EnergyCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Grubbin';
  public cardType: CardType[] = [L];
  public hp: number = 80;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Battery',
    powerType: PowerType.ABILITY,
    useFromHand: true,
    text: 'Once during your turn (before your attack), you may attach this card from your hand to 1 of your Vikavolt or Vikavolt-GX as a Special Energy card. This card provides 2 [L] Energy only while it\'s attached to a Pokémon.'
  }];

  public attacks = [{
    name: 'Pierce',
    cost: [C, C, C],
    damage: 60,
    text: ''
  }];

  public set: string = 'UNB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '58';
  public name: string = 'Charjabug';
  public fullName: string = 'Charjabug UNB';

  public provides: CardType[] = [CardType.LIGHTNING, CardType.LIGHTNING];
  public energyType = EnergyType.SPECIAL;
  // EnergyCard interface properties
  public text: string = '';
  public isBlocked = false;
  public energyEffect: any = undefined;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Auto-detect if we've been removed from energies and reset superType back to POKEMON
    if (this.superType === SuperType.ENERGY) {
      const cardList = StateUtils.findCardList(state, this);
      if (!(cardList instanceof PokemonCardList) || !cardList.energies.cards.includes(this)) {
        this.superType = SuperType.POKEMON;
      }
    }

    // The Special Energy Stuff
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.energyPlayedTurn === state.turn) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      player.energyPlayedTurn = state.turn;

      let isVikavoltActive = false;
      let isVikavoltBenched = false;

      const blockedTo: CardTarget[] = [];
      if (player.active.getPokemonCard()?.name !== 'Vikavolt' && player.active.getPokemonCard()?.name !== 'Vikavolt-GX') {
        const target: CardTarget = {
          player: PlayerType.BOTTOM_PLAYER,
          slot: SlotType.ACTIVE,
          index: 0
        };
        blockedTo.push(target);
      } else {
        isVikavoltActive = true;
      }

      player.bench.forEach((bench, index) => {
        if (bench.cards.length === 0) {
          return;
        }

        if (bench.getPokemonCard()?.name === 'Vikavolt' || bench.getPokemonCard()?.name === 'Vikavolt-GX') {
          isVikavoltBenched = true;
        } else {
          const target: CardTarget = {
            player: PlayerType.BOTTOM_PLAYER,
            slot: SlotType.BENCH,
            index
          };
          blockedTo.push(target);
        }
      });

      if (!isVikavoltActive && !isVikavoltBenched) { throw new GameError(GameMessage.CANNOT_USE_POWER); }

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { allowCancel: false, blocked: blockedTo }
      ), targets => {
        if (!targets || targets.length === 0) {
          return;
        }

        // Moving it onto the pokemon - first to main cards array, then to energies
        effect.preventDefault = true;
        MOVE_CARDS(store, state, player.hand, targets[0], { cards: [this], sourceCard: this });
        if (!targets[0].energies.cards.includes(this)) {
          targets[0].energies.cards.push(this);
        }
        this.superType = SuperType.ENERGY;
      });
    }

    // Provide energy when attached as energy and included in CheckProvidedEnergyEffect
    if (effect instanceof CheckProvidedEnergyEffect && effect.source.energies.cards.includes(this)) {
      effect.energyMap.push({ card: this, provides: this.provides });
    }

    return state;
  }
}
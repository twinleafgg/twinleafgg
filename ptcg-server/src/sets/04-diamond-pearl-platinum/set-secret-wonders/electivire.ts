import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, EnergyCard, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { GameError } from '../../../game/game-error';
import { GameMessage } from '../../../game/game-message';
import {ABILITY_USED, ADD_MARKER, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class Electivire extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Electabuzz';
  public hp: number = 100;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: 30 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Motor Drive',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may search your discard pile for a Lightning Energy card and attach it to Electivire. This power can\'t be used if Electivire is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Discharge',
    cost: [L, C, C],
    damage: 50,
    damageCalculation: 'x',
    text: 'Discard all Lightning Energy attached to Electivire. Flip a coin for each Lightning Energy you discarded. This attack does 50 damage times the number of heads.'
  }];

  public set: string = 'SW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '25';
  public name: string = 'Electivire';
  public fullName: string = 'Electivire SW';

  public readonly MOTOR_DRIVE_MARKER = 'MOTOR_DRIVE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Motor Drive
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const hasEnergyInDiscard = player.discard.cards.some(c => {
        return c instanceof EnergyCard
          && c.energyType === EnergyType.BASIC
          && c.provides.includes(CardType.LIGHTNING);
      });
      if (!hasEnergyInDiscard || cardList === undefined) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (player.marker.hasMarker(this.MOTOR_DRIVE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        player.discard,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
        { allowCancel: false, min: 1, max: 1 }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }
        ABILITY_USED(player, this);
        ADD_MARKER(this.MOTOR_DRIVE_MARKER, player, this);
        MOVE_CARDS(store, state, player.discard, cardList, { cards: cards, sourceCard: this });
      });
      return state;
    }

    // Discharge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const energyCount = checkProvidedEnergy.energyMap.reduce(
        (left, p) => left + p.provides.length, 0
      );
      if (energyCount > 0) {
        MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, energyCount, results => {
          const heads = results.filter(r => r).length;
          effect.damage = 50 * heads;
        });
      }
    }

    return state;
  }
}

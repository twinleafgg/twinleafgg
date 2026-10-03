import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Card, ChooseCardsPrompt, GameError, GameMessage, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { EnergyCard } from '../../../game/store/card/energy-card';
import {ABILITY_USED, MULTIPLE_COIN_FLIPS_PROMPT, SHUFFLE_DECK, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class Heliolisk extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Helioptile';
  public hp: number = 120;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: 'Frilled Generator',
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, if you played Canari from your hand this turn, you may use this Ability. Search your deck for up to 2 Basic Lightning Energy cards and attach them to this Pokémon. Then, shuffle your deck.'
  }];

  public attacks = [{
    name: 'Powerful Bolt',
    cost: [L, C, C],
    damage: 70,
    damageCalculation: 'x',
    text: 'Flip a coin for each Energy attached to this Pokémon. This attack does 70 damage for each heads.'
  }];

  public regulationMark = 'I';

  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '64';
  public name: string = 'Heliolisk';
  public fullName: string = 'Heliolisk ASC';

  public readonly FRILLED_GENERATOR_MARKER = 'FRILLED_GENERATOR_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Frilled Generator
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const blocked: number[] = [];

      if (!player.playedCanari) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.FRILLED_GENERATOR_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      player.deck.cards.forEach((card, index) => {
        if (
          !(card instanceof EnergyCard && card.energyType === EnergyType.BASIC && card.provides.includes(L))
        ) {
          blocked.push(index);
        }
      });

      player.marker.addMarker(this.FRILLED_GENERATOR_MARKER, this);
      ABILITY_USED(player, this);

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_ATTACH,
          player.deck,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 0, max: 2, allowCancel: false, blocked },
        ),
        (cards: Card[]) => {
          cards = cards || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.deck, cardList, { cards: cards, sourceCard: this });
          }
          SHUFFLE_DECK(store, state, player);
        },
      );
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.FRILLED_GENERATOR_MARKER, this)) {
      effect.player.marker.removeMarker(this.FRILLED_GENERATOR_MARKER, this);
    }

    // Powerful Bolt
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      // Count energy attached
      const checkEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkEnergy);
      const energyCount = checkEnergy.energyMap.length;
      if (energyCount === 0) {
        effect.damage = 0;
        return state;
      }
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, energyCount, results => {
        const heads = results.filter(r => r).length;
        effect.damage = 70 * heads;
      });
    }

    return state;
  }
}

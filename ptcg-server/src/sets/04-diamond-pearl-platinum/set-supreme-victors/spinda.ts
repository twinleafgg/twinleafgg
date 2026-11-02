import { Card, ChooseCardsPrompt, GameMessage, PokemonCard, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Spinda extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Synchro Removal',
    cost: [C],
    damage: 0,
    text: 'If any Energy card attached to Spinda is the same type as any Energy card attached to the Defending Pokémon, discard 1 of those Energy cards from the Defending Pokémon.'
  }, {
    name: 'Pulled Punch',
    cost: [C],
    damage: 30,
    text: 'If the Defending Pokémon already has any damage counters on it, this attack\'s base damage is 10 instead of 30.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '46';
  public name: string = 'Spinda';
  public fullName: string = 'Spinda SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Synchro Removal
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const playerEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, playerEnergy);
      const opponentEnergy = new CheckProvidedEnergyEffect(opponent, opponent.active);
      store.reduceEffect(state, opponentEnergy);

      const playerTypes = new Set(playerEnergy.energyMap.flatMap(em => em.provides));
      const matchingCards = opponentEnergy.energyMap
        .filter(em => em.provides.some(t =>
          t === CardType.ANY
          || playerTypes.has(CardType.ANY)
          || playerTypes.has(t)
        ))
        .map(em => em.card);

      if (matchingCards.length === 0) {
        return state;
      }

      const blocked: number[] = [];
      opponent.active.cards.forEach((card, index) => {
        if (!matchingCards.includes(card)) {
          blocked.push(index);
        }
      });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        opponent.active,
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false, blocked }
      ), selected => {
        const cards: Card[] = selected || [];
        if (cards.length > 0) {
          const discardEnergy = new DiscardCardsEffect(effect, cards);
          discardEnergy.target = opponent.active;
          store.reduceEffect(state, discardEnergy);
        }
      });
    }

    // Pulled Punch
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.opponent.active.damage > 0) {
        effect.damage = 10;
      }
    }

    return state;
  }
}

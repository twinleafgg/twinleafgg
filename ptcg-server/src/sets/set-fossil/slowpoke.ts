import { PokemonCard } from '../../game/store/card/pokemon-card';
import { Stage, CardType, TrainerType, SuperType } from '../../game/store/card/card-types';
import { StoreLike, State, Card, ChooseEnergyPrompt, GameMessage, StateUtils, TrainerCard, ChooseCardsPrompt, ShowCardsPrompt, GameError } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { DiscardCardsEffect } from '../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../game/store/effects/check-effects';
import { HealEffect } from '../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../game/store/prefabs/prefabs';

export class Slowpoke extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.PSYCHIC];
  public hp: number = 50;
  public weakness = [{ type: CardType.PSYCHIC }];
  public retreat = [CardType.COLORLESS];

  public attacks = [{
    name: 'Spacing Out',
    cost: [C],
    damage: 0,
    text: 'Flip a coin. If heads, remove a damage counter from Slowpoke. This attack can\'t be used if Slowpoke has no damage counters on it.'
  },
  {
    name: 'Scavenge',
    cost: [P, P],
    damage: 0,
    text: 'Discard 1 [P] Energy card attached to Slowpoke in order to use this attack. Put a Trainer card from your discard pile into your hand.'
  }];

  public set: string = 'FO';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '55';
  public name: string = 'Slowpoke';
  public fullName: string = 'Slowpoke FO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const target = player.active;

      if (target.damage === 0) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      } else {
        const healEffect = new HealEffect(player, target, 10);
        state = store.reduceEffect(state, healEffect);
        return state;
      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      state = store.prompt(state, new ChooseEnergyPrompt(
        player.id,
        GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
        checkProvidedEnergy.energyMap,
        [CardType.PSYCHIC],
        { allowCancel: true }
      ), energy => {
        const cards: Card[] = (energy || []).map(e => e.card);
        if (cards.length > 0) {
          const discardEnergy = new DiscardCardsEffect(effect, cards);
          discardEnergy.target = player.active;
          return store.reduceEffect(state, discardEnergy);
        }
      });

      const hasTrainer = player.discard.cards.some(c => {
        return c instanceof TrainerCard;
      });

      if (!hasTrainer) {
        return state;
      }

      let cards: Card[] = [];
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.discard,
        { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
        { min: 1, max: 1, allowCancel: true }
      ), selected => {
        cards = selected || [];

        if (cards.length > 0) {
          return store.prompt(state, new ShowCardsPrompt(
            opponent.id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            cards
          ), () => state);
        }

        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this });
        }
      });
    }

    return state;
  }
}
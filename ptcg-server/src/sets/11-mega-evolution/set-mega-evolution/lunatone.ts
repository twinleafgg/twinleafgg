import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt, GameError, GameMessage, PlayerType, PowerType, StateUtils } from '../../../game';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {ABILITY_USED, DRAW_CARDS, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Lunatone extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public regulationMark = 'I';
  public cardType: CardType[] = [F];
  public weakness = [{ type: G }];
  public hp: number = 110;
  public retreat = [C];

  public powers = [{
    name: 'Lunar Cycle',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn, if you have Solrock in play, you may discard a Basic [F] Energy card from your hand in order to use this Ability. Draw 3 cards. You can\'t use more than 1 Lunar Cycle Ability each turn.'
  }];

  public attacks = [{
    name: 'Power Gem',
    cost: [F, F],
    damage: 50,
    text: ''
  }];

  public set: string = 'MEG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '74';
  public name: string = 'Lunatone';
  public fullName: string = 'Lunatone M1L';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.usedLunarCycle == true) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      let isSolrockInPlay = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card.name === 'Solrock') {
          isSolrockInPlay = true;
        }
      });

      if (!isSolrockInPlay) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const hasEnergyInHand = player.hand.cards.some(c => {
        return c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC && c.name === 'Fighting Energy';
      });
      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fighting Energy' },
        { allowCancel: true, min: 1, max: 1 }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }
        MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

        DRAW_CARDS(store, state, player, 3);
        player.usedLunarCycle = true;

        ABILITY_USED(player, this);
      });
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);

      if (owner === player) {
        player.usedLunarCycle = false;
      }
    }

    return state;
  }
}
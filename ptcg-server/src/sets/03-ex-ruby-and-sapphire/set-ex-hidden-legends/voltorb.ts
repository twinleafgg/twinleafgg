import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard, StoreLike, State, ChooseCardsPrompt, GameMessage, ShuffleDeckPrompt } from '../../../game';
import { EnergyCard } from '../../../game/store/card/energy-card';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Voltorb extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 40;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Recharge',
    cost: [C],
    damage: 0,
    text: 'Search your deck for a [L] Energy card and attach it to Voltorb. Shuffle your deck afterward.'
  },
  {
    name: 'Rolling Attack',
    cost: [L, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'HL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '80';
  public name: string = 'Voltorb';
  public fullName: string = 'Voltorb HL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const blocked: number[] = [];
      player.deck.cards.forEach((c, i) => {
        if (!(c instanceof EnergyCard)) blocked.push(i);
        else if (c.energyType !== EnergyType.BASIC) blocked.push(i);
        else if (!c.provides.includes(CardType.LIGHTNING)) blocked.push(i);
      });
      const hasBasicLightning = player.deck.cards.some(c => c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.provides.includes(CardType.LIGHTNING));
      if (!hasBasicLightning) {
        return state;
      }
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        player.deck,
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false, blocked }
      ), selected => {
        const cards = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.deck, player.active, { cards: [cards[0]], sourceCard: this });
          return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
            player.deck.applyOrder(order);
          });
        }
        return state;
      });
    }
    return state;
  }
}

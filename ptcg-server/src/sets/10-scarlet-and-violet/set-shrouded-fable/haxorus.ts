import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';

import { StateUtils } from '../../../game/store/state-utils';
import { CardList, EnergyCard, GameLog } from '../../../game';
import { KNOCK_OUT_OPPONENTS_ACTIVE_POKEMON } from '../../../game/store/prefabs/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Haxorus extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Fraxure';
  public cardType: CardType[] = [N];
  public hp: number = 170;
  public retreat = [C, C];

  public attacks = [{
    name: 'Bring Down the Axe',
    cost: [F],
    damage: 0,
    text: 'If your opponent\'s Active Pokémon has any Special Energy attached, it is Knocked Out.'
  },
  {
    name: 'Dragon Pulse',
    cost: [F, M],
    damage: 230,
    text: 'Discard the top 3 cards of your deck'
  }];

  public regulationMark: string = 'H';
  public set: string = 'SFA';
  public name: string = 'Haxorus';
  public fullName: string = 'Haxorus SFA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '46';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Bring Down the Axe
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let specialEnergyCount = 0;
      opponent.active.cards.forEach(c => {
        if (c instanceof EnergyCard) {
          if (c.energyType === EnergyType.SPECIAL) {
            specialEnergyCount++;
          }
        }
      });

      if (specialEnergyCount > 0) {
        KNOCK_OUT_OPPONENTS_ACTIVE_POKEMON(store, state, effect);
        return state;
      }
    }

    // Dragon Pulse
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 3, sourceCard: this });
      const discards = deckTop.cards;

      MOVE_CARDS(store, state, deckTop, player.discard, { count: deckTop.cards.length, sourceCard: this });

      discards.forEach((card, index) => {
        store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD, { name: player.name, card: card.name, effectName: effect.attack.name });
      });
    }

    return state;
  }
}
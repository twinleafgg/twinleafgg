import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { StoreLike, State, CardList, GameLog } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {BLOCK_TRAINER_TARGET, IS_TRAINER_TARGET, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Fraxure extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Axew';
  public cardType: CardType[] = [CardType.DRAGON];
  public hp: number = 100;
  public weakness = [];
  public resistance = [];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Unnerve',
    powerType: PowerType.ABILITY,
    text: 'Whenever your opponent plays an Item or Supporter card from their hand, prevent all effects of that card done to this Pokemon.'
  }];
  public attacks = [{
    name: 'Dragon Pulse',
    cost: [CardType.FIGHTING, CardType.METAL],
    damage: 80,
    text: 'Discard the top card of your deck'
  }];

  public set: string = 'SFA';
  public name: string = 'Fraxure';
  public fullName: string = 'Fraxure SFA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '45';
  public regulationMark: string = 'H';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (IS_TRAINER_TARGET(effect, this)) {
      BLOCK_TRAINER_TARGET(effect);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 1, sourceCard: this });
      const discards = deckTop.cards;

      MOVE_CARDS(store, state, deckTop, player.discard, { count: deckTop.cards.length, sourceCard: this });

      discards.forEach((card, index) => {
        store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD, { name: player.name, card: card.name, effectName: effect.attack.name });
      });
      return state;
    }

    return state;
  }
}
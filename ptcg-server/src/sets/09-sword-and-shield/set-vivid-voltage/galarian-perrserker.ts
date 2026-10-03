import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, Card, ChooseCardsPrompt, GameMessage, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class GalarianPerrserker extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Galarian Meowth';
  public cardType: CardType[] = [M];
  public hp: number = 120;
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Stealy Claws',
    cost: [M],
    damage: 20,
    text: 'Flip 3 coins. If any of them are heads, your opponent reveals their hand. Then, for each heads, discard a Trainer card from your opponent\'s hand.'
  }, {
    name: 'Claw Slash',
    cost: [M, C, C],
    damage: 90,
    text: ''
  }];

  public set: string = 'VIV';

  public regulationMark: string = 'D';

  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '113';
  public name: string = 'Galarian Perserker';
  public fullName: string = 'Galarian Perserker VIV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let headsCount = 0;
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, (results) => {
        results.forEach(result => {
          if (result) {
            headsCount++;
          }
        });

        if (headsCount === 0) {
          return state;
        }

        const minDiscard = Math.min(opponent.hand.cards.filter(c => c.superType === SuperType.TRAINER).length, headsCount);

        let cards: Card[] = [];
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          opponent.hand,
          { superType: SuperType.TRAINER },
          { min: minDiscard, max: minDiscard, allowCancel: false }
        ), selected => {
          cards = selected || [];
          MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: cards, sourceCard: this });
        });
      });
    }

    return state;
  }
}
import { CardType, ChooseCardsPrompt, GameMessage, PokemonCard, ShowCardsPrompt, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Quagsire extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Wooper';
  public hp: number = 130;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public resistance = [];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Hot-Blooded Head',
    cost: [W],
    damage: 20,
    damageCalculation: '+',
    text: 'You may reveal a Crasher Wake\'s Passion from your hand. If you do, this attack does 120 more damage.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '18';
  public name: string = 'Quagsire';
  public fullName: string = 'Quagsire FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hot-Blooded Head
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasPassion = player.hand.cards.some(c => c.name === 'Crasher Wake\'s Passion');
      if (!hasPassion) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.hand,
        { name: 'Crasher Wake\'s Passion' },
        { min: 0, max: 1, allowCancel: true }
      ), selected => {
        const cards = selected || [];
        if (cards.length === 0) {
          return;
        }

        effect.damage += 120;

        store.prompt(state, new ShowCardsPrompt(
          opponent.id,
          GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
          cards
        ), () => { });
      });
    }

    return state;
  }
}

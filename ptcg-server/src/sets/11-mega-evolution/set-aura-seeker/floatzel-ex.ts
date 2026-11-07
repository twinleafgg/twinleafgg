import { CardTag, CardType, ChooseCardsPrompt, GameMessage, PokemonCard, ShowCardsPrompt, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Floatzelex extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Buizel';
  protected _tags = [CardTag.POKEMON_ex];
  public hp: number = 260;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public resistance = [];
  public retreat = [C];

  public attacks = [{
    name: 'Hustle Screw',
    cost: [W, C],
    damage: 40,
    damageCalculation: '+',
    text: 'Reveal any number of Crasher Wake\'s Passion cards from your hand to your opponent. This attack does 100 more damage for each card revealed in this way. Then, shuffle the revealed cards back into your deck.'
  },
  {
    name: 'Waterfall',
    cost: [W, C, C],
    damage: 150,
    text: ''
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '20';
  public name: string = 'Floatzel ex';
  public fullName: string = 'Floatzel ex FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hustle Screw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const passionInHand = player.hand.cards.filter(c => c.name === 'Crasher Wake\'s Passion');
      if (passionInHand.length === 0) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.hand,
        { name: 'Crasher Wake\'s Passion' },
        { min: 0, max: passionInHand.length, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        if (cards.length === 0) {
          return;
        }

        effect.damage += 100 * cards.length;

        store.prompt(state, new ShowCardsPrompt(
          opponent.id,
          GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
          cards
        ), () => { });

        MOVE_CARDS(store, state, player.hand, player.deck, {
          cards,
          sourceCard: this,
          sourceEffect: this.attacks[0]
        });
        SHUFFLE_DECK(store, state, player);
      });
    }

    return state;
  }
}

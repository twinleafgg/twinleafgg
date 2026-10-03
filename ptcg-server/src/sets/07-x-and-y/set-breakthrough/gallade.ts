import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { CardList, GameError, GameMessage, OrderCardsPrompt, PowerType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {ABILITY_USED, ADD_MARKER, HAS_MARKER, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Gallade extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Kirlia';
  public cardType: CardType[] = [F];
  public hp: number = 150;
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public powers = [{
    name: 'Premonition',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may look at the top 5 cards of your deck and put them back on top of your deck in any order.'
  }];

  public attacks = [{
    name: 'Sensitive Blade',
    cost: [C, C],
    damage: 60,
    damageCalculation: '+',
    text: 'If you played a Supporter card from your hand during this turn, this attack does 70 more damage.'
  }];

  public set: string = 'BKT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '84';
  public name: string = 'Gallade';
  public fullName: string = 'Gallade BKT';

  public readonly PREMONITION_MARKER = 'PREMONITION_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (HAS_MARKER(this.PREMONITION_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      ADD_MARKER(this.PREMONITION_MARKER, player, this);
      ABILITY_USED(player, this);

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 5, sourceCard: this });

      return store.prompt(state, new OrderCardsPrompt(
        player.id,
        GameMessage.CHOOSE_CARDS_ORDER,
        deckTop,
        { allowCancel: false },
      ), order => {
        if (order === null) {
          return state;
        }

        deckTop.applyOrder(order);
        deckTop.moveToTopOfDestination(player.deck);
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.PREMONITION_MARKER, this);

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const supporterTurn = player.supporterTurn;
      if (supporterTurn) {
        effect.damage += 70;
      }
    }

    return state;
  }
}
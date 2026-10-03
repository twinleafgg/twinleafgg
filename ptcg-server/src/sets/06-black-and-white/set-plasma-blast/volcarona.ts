import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, Card, ShowCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON } from '../../../game/store/prefabs/attack-effects';

export class Volcarona extends PokemonCard {
  protected _tags = [CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Larvesta';
  public cardType: CardType[] = [R];
  public hp: number = 100;
  public weakness = [{ type: W }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Solar Transporter',
      cost: [C],
      damage: 0,
      text: 'Reveal the top 5 cards of your deck and put all Team Plasma cards you find there into your hand. Discard the other cards.',
    },
    {
      name: 'Leech Life',
      cost: [R, R, C],
      damage: 50,
      text: 'Heal from this Pok\u00e9mon the same amount of damage you did to the Defending Pok\u00e9mon.',
    },
  ];

  public set: string = 'PLB';
  public setNumber: string = '13';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Volcarona';
  public fullName: string = 'Volcarona PLB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const topCards = player.deck.cards.slice(0, Math.min(5, player.deck.cards.length));
      if (topCards.length === 0) {
        return state;
      }

      const teamPlasmaCards: Card[] = [];
      const otherCards: Card[] = [];

      topCards.forEach((card) => {
        if (card instanceof PokemonCard && card.hasTag(CardTag.TEAM_PLASMA)) {
          teamPlasmaCards.push(card);
        } else if (card instanceof TrainerCard && card.hasTag(CardTag.TEAM_PLASMA)) {
          teamPlasmaCards.push(card);
        } else if (card.superType === SuperType.ENERGY && card.hasTag(CardTag.TEAM_PLASMA)) {
          teamPlasmaCards.push(card);
        } else {
          otherCards.push(card);
        }
      });

      // Show all revealed cards to opponent
      store.prompt(
        state,
        new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, topCards),
        () => {
          // Move Team Plasma cards to hand
          teamPlasmaCards.forEach((card) => {
            MOVE_CARDS(store, state, player.deck, player.hand, { cards: [card], sourceCard: this });
          });
          // Discard the other cards
          otherCards.forEach((card) => {
            MOVE_CARDS(store, state, player.deck, player.discard, { cards: [card], sourceCard: this });
          });
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      HEAL_X_DAMAGE_FROM_THIS_POKEMON(effect.damage, effect, store, state);
    }

    return state;
  }
}

import {
  Card,
  CardList,
  CardTag,
  CardType,
  ChooseCardsPrompt,
  ChoosePrizePrompt,
  GameMessage,
  PokemonCard,
  Stage,
  State,
  StoreLike,
  SuperType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Blacephalon extends PokemonCard {
  protected _tags = [CardTag.ULTRA_BEAST];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 120;
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Blazer',
      cost: [R],
      damage: 10,
      damageCalculation: '+',
      text: "Turn 1 of your face-down Prize cards face up. If it's a [R] Energy card, this attack does 50 more damage. (That Prize card remains face up for the rest of the game.) ",
    },
    {
      name: 'Fireball Circus',
      cost: [R, R, R],
      damage: 0,
      damageCalculation: 'x',
      text: 'Discard any number of [R] Energy cards from your hand. This attack does 50 damage for each card you discarded in this way.',
    },
  ];

  public set = 'UNB';
  public setNumber = '32';
  public cardImage = 'assets/cardback.png';
  public name = 'Blacephalon';
  public fullName = 'Blacephalon UNB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Blazer
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return store.prompt(
        state,
        new ChoosePrizePrompt(player.id, GameMessage.CHOOSE_PRIZE_CARD, {
          count: 1,
          allowCancel: false,
        }),
        (prizes) => {
          if (prizes && prizes.length > 0) {
            const prize: CardList = prizes[0];
            const prizeCard: Card = prize.cards[0];
            if (prizeCard.superType == SuperType.ENERGY && prizeCard.name == 'Fire Energy') {
              effect.damage += 50;
            }
            prize.isPublic = true;
            prize.isSecret = false;
          }
        },
      );
    }
    // Fireball Circus
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          { superType: SuperType.ENERGY, name: 'Fire Energy' },
          { min: 1, allowCancel: false },
        ),
        (selected) => {
          effect.damage += 50 * selected.length;
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: selected, sourceCard: this });
        },
      );
    }

    return state;
  }
}

import {
  PokemonCard,
  Stage,
  CardType,
  StoreLike,
  State,
  StateUtils,
  TrainerCard,
  TrainerType,
  ChooseCardsPrompt,
  GameMessage,
  SuperType,
  GameLog,
  CardTag,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_ATTACK_USED,
  AFTER_ATTACK,
  ADD_SLEEP_TO_PLAYER_ACTIVE, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WITH_PROMPT_CONTROLLER } from '../../../game/store/prefabs/trainer-prefabs';

export class Hypno extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Drowzee';
  public cardType: CardType[] = [P];
  public hp: number = 90;
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Hand Control',
      cost: [P],
      damage: 0,
      text: 'Your opponent reveals his or her hand. You may choose a Supporter card you find there. If you do, your opponent plays that Supporter card. However, you make all decisions for that card. (That Supporter card is discarded.)',
    },
    {
      name: 'Hypnoblast',
      cost: [P, P, P],
      damage: 60,
      text: "Your opponent's Active Pokémon is now Asleep.",
    },
  ];

  public set: string = 'FFI';
  public setNumber: string = '36';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Hypno';
  public fullName: string = 'Hypno FFI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Hand Control
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const supporterCards = opponent.hand.cards.filter(
        (c) => c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER,
      );

      if (supporterCards.length === 0) {
        return state;
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_COPY_EFFECT,
          opponent.hand,
          { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
          { min: 0, max: 1, allowCancel: true },
        ),
        (selected) => {
          selected = selected || [];
          if (selected.length === 0) {
            return;
          }

          const supporterCard = selected[0] as TrainerCard;
          MOVE_CARDS(store, state, opponent.hand, opponent.supporter, { cards: [supporterCard], sourceCard: this });

          state = WITH_PROMPT_CONTROLLER(store, state, player.id, (s) => {
            s = store.reduceEffect(s, new TrainerEffect(opponent, supporterCard));
            store.log(s, GameLog.LOG_PLAYER_PLAYS_SUPPORTER, {
              name: opponent.name,
              card: supporterCard.name,
            });
            return s;
          });

          const cleanup = () => {
            if (!opponent.supporter.cards.includes(supporterCard)) {
              return;
            }
            const target = supporterCard.hasTag(CardTag.PRISM_STAR)
              ? opponent.lostzone
              : opponent.discard;
            MOVE_CARDS(store, state, opponent.supporter, target, { cards: [supporterCard], sourceCard: this });
          };

          if (store.hasPrompts()) {
            store.waitPrompt(state, cleanup);
          } else {
            cleanup();
          }
        },
      );
    }

    // Hypnoblast
    if (AFTER_ATTACK(effect, 1, this)) {
      ADD_SLEEP_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
    }

    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike, State, PowerType, StateUtils, PokemonCardList, TrainerCard, ChooseCardsPrompt, GameMessage, GameError } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {ABILITY_USED, ADD_MARKER, HAS_MARKER, IS_ABILITY_BLOCKED, REMOVE_MARKER_AT_END_OF_TURN, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { CAN_PLAY_SUPPORTER_CARD } from '../../../game/store/prefabs/trainer-prefabs';

export class Porygon2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Porygon';
  public cardType: CardType[] = [C];
  public hp: number = 70;
  public weakness = [{ type: F, value: +20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Download',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may discard a Supporter card from your hand and use the effect of that card as the effect of this power. This power can\'t be used if Porygon2 is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Speed Attack',
    cost: [C, C],
    damage: 30,
    text: ''
  }];

  public set: string = 'GE';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '49';
  public name: string = 'Porygon2';
  public fullName: string = 'Porygon2 GE';

  public readonly DOWNLOAD_MARKER = 'DOWNLOAD_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.DOWNLOAD_MARKER, this);

    // Ref: set-secret-wonders/gardevoir.ts (Telepass), set-forbidden-light/sylveon.ts (Wink Wink)
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      const supportersInHand = player.hand.cards.filter(card =>
        card instanceof TrainerCard && card.trainerType === TrainerType.SUPPORTER
      );

      if (!supportersInHand || supportersInHand.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (HAS_MARKER(this.DOWNLOAD_MARKER, player)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (cardList.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      ADD_MARKER(this.DOWNLOAD_MARKER, player, this);
      ABILITY_USED(player, this);

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_COPY_EFFECT,
        player.hand,
        { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
        { allowCancel: false, min: 1, max: 1 }
      ), cards => {
        const trainerCard = cards[0] as TrainerCard;

        if (!CAN_PLAY_SUPPORTER_CARD(store, state, player, trainerCard, true)) {
          return state;
        }

        MOVE_CARDS(store, state, player.hand, player.discard, { cards: [trainerCard], sourceCard: this });

        const originalSupporterTurn = player.supporterTurn;
        player.supporterTurn = 0;
        try {
          const playTrainerEffect = new TrainerEffect(player, trainerCard);
          store.reduceEffect(state, playTrainerEffect);
        } finally {
          player.supporterTurn = originalSupporterTurn;
        }
      });
    }

    return state;
  }
}

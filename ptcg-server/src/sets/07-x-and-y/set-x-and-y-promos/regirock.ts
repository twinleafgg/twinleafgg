import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, TrainerType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, PowerType, StateUtils, TrainerCard, ChooseCardsPrompt, GameMessage, ShowCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { BLOCK_TRAINER_TARGET, IS_TRAINER_TARGET } from '../../../game/store/prefabs/prefabs';

export class Regirock extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 110;
  public weakness = [{ type: G }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Ω Barrier',
    powerType: PowerType.ANCIENT_TRAIT,
    text: 'Whenever your opponent plays a Trainer card (excluding Pokémon Tools and Stadium cards), prevent all effects of that card done to this Pokémon.'
  }];

  public attacks = [
    {
      name: 'Land Maker',
      cost: [F],
      damage: 0,
      text: 'Put 2 Stadium cards from your discard pile into your hand.'
    },
    {
      name: 'Stone Edge',
      cost: [F, F, F, C],
      damage: 80,
      damageCalculation: '+',
      text: 'Flip a coin. If heads, this attack does 40 more damage.'
    },
  ];

  public set: string = 'XYP';
  public setNumber = '49';
  public cardImage = 'assets/cardback.png';
  public name: string = 'Regirock';
  public fullName: string = 'Regirock XYP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (
      IS_TRAINER_TARGET(effect, this) &&
      effect.player !== StateUtils.findOwner(state, StateUtils.findCardList(state, this)) && // Ensure the trainer's owner is the opponent
      !(effect.trainerCard?.trainerType === TrainerType.TOOL || effect.trainerCard?.trainerType === TrainerType.STADIUM)
    ) {
      const targetCard = effect.target.getPokemonCard();
      if (targetCard && targetCard.fullName === this.fullName) {
        BLOCK_TRAINER_TARGET(effect);
      }
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const stadiumCount = player.discard.cards.filter(c => {
        return c instanceof TrainerCard && c.trainerType === TrainerType.STADIUM;
      }).length;

      if (stadiumCount === 0) {
        return state;
      }

      const max = Math.min(2, stadiumCount);

      return store.prompt(state, [
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          { superType: SuperType.TRAINER, trainerType: TrainerType.STADIUM },
          { min: 1, max, allowCancel: false }
        )], selected => {
          const cards = selected || [];

          cards.forEach((card, index) => {
            MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this });
          });

          store.prompt(state, [new ShowCardsPrompt(
            opponent.id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            cards
          )], () => {
          });
        });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 40);
    }

    return state;
  }
}
import { ChooseCardsPrompt, GameMessage, State, StateUtils, StoreLike, TrainerCard, TrainerType } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Raticate extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Rattata';
  public hp: number = 70;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +20 }];
  public retreat = [];

  public attacks = [{
    name: 'Recruit',
    cost: [C],
    damage: 0,
    text: 'Look at your opponent\'s hand, choose a Supporter card you find there, and discard it. Then, use the effect of that card as the effect of this attack.'
  }, {
    name: 'Extend Fang',
    cost: [C],
    damage: 20,
    damageCalculation: '+',
    text: 'If Raticate has a Pokémon Tool card attached to it, this attack does 20 damage plus 40 more damage.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '29';
  public name: string = 'Raticate';
  public fullName: string = 'Raticate AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Recruit
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      SHOW_CARDS_TO_PLAYER(store, state, player, opponent.hand.cards);
      const supporters = opponent.hand.cards.filter(
        c => c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER
      );
      if (supporters.length === 0) {
        return state;
      }
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        opponent.hand,
        { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        if (cards.length === 0) {
          return;
        }
        const supporterCard = cards[0] as TrainerCard;
        MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: [supporterCard], sourceCard: this });
        const trainerEffect = new TrainerEffect(player, supporterCard);
        store.reduceEffect(state, trainerEffect);
      });
    }

    // Extend Fang
    if (WAS_ATTACK_USED(effect, 1, this)) {
      if (effect.source.tools.length > 0) {
        effect.damage += 40;
      }
    }

    return state;
  }
}

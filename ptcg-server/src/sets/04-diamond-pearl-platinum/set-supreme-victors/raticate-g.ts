import { Card, ChooseCardsPrompt, GameMessage, State, StoreLike, TrainerCard } from '../../../game';
import { CardTag, CardType, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class RaticateG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 70;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +20 }];
  public retreat = [];

  public attacks = [{
    name: 'Find',
    cost: [C],
    damage: 0,
    text: 'Search your discard pile for a Trainer card or a Supporter card, show it to your opponent, and put it into your hand.'
  }, {
    name: 'Biting Fang',
    cost: [C],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin, if heads this attack does 10 damage plus 20 more damage.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '78';
  public name: string = 'Raticate G';
  public fullName: string = 'Raticate G SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Find
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      const isTrainerOrSupporter = (card: Card) =>
        card instanceof TrainerCard &&
        (card.trainerType === TrainerType.ITEM || card.trainerType === TrainerType.SUPPORTER);
      if (!player.discard.cards.some(isTrainerOrSupporter)) {
        return state;
      }
      const blocked: number[] = [];
      player.discard.cards.forEach((card, index) => {
        if (!isTrainerOrSupporter(card)) {
          blocked.push(index);
        }
      });
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.discard,
        { superType: SuperType.TRAINER },
        { min: 0, max: 1, allowCancel: true, blocked }
      ), selected => {
        if (selected && selected.length > 0) {
          MOVE_CARDS(store, state, player.discard, player.hand, { cards: selected, sourceCard: this });
          SHOW_CARDS_TO_PLAYER(store, state, opponent, selected);
        }
      });
    }

    // Biting Fang
    if (WAS_ATTACK_USED(effect, 1, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 20);
    }

    return state;
  }
}

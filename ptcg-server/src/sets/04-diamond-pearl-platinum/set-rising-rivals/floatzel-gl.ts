import { CardTag, CardType, ChooseCardsPrompt, GameMessage, PokemonCard, Stage, State, StateUtils, StoreLike, SuperType, TrainerCard, TrainerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER, THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class FloatzelGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Incite',
    cost: [],
    damage: 0,
    text: 'Search your discard pile for up to 2 Supporter cards, show them to your opponent, and put them into your hand.',
  }, {
    name: 'Giant Wave',
    cost: [W, W],
    damage: 50,
    text: 'Floatzel GL can\'t use Giant Wave during your next turn.',
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Floatzel GL';
  public fullName: string = 'Floatzel GL RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Incite
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const hasSupporter = player.discard.cards.some(
        c => c instanceof TrainerCard && c.trainerType === TrainerType.SUPPORTER,
      );
      if (!hasSupporter) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.discard,
        { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
        { min: 0, max: 2, allowCancel: true },
      ), selected => {
        const cards = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.discard, player.hand, { cards });
          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
        }
      });
    }

    // Giant Wave
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(effect.player, this.attacks[1]);
    }

    return state;
  }
}

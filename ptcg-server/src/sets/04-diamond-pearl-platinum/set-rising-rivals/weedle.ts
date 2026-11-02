import { CardType, ChooseCardsPrompt, GameMessage, PokemonCard, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../../game/store/prefabs/attack-effects';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Weedle extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Rescue String',
    cost: [],
    damage: 0,
    text: 'Search your discard pile for up to 5 Pokémon, show them to your opponent, and shuffle them into your deck.'
  },
  {
    name: 'Needling Sting',
    cost: [G],
    damage: 10,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 10 damage plus 10 more damage.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '86';
  public name: string = 'Weedle';
  public fullName: string = 'Weedle RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rescue String
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (!player.discard.cards.some(c => c instanceof PokemonCard)) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DECK,
        player.discard,
        { superType: SuperType.POKEMON },
        { min: 0, max: 5, allowCancel: true }
      ), selected => {
        const cards = selected || [];
        if (cards.length === 0) {
          return;
        }
        MOVE_CARDS(store, state, player.discard, player.deck, { cards, sourceCard: this });
        SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
        SHUFFLE_DECK(store, state, player);
      });
    }

    // Needling Sting
    if (WAS_ATTACK_USED(effect, 1, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 10);
    }

    return state;
  }
}

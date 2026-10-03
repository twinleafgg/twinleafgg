import { PokemonCard, Stage, CardType, State, StoreLike, GameError, GameMessage, ChooseCardsPrompt, Card, SuperType, CardList } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Slowpoke extends PokemonCard {

  public regulationMark = 'H';
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 80;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Dangle Tail',
      cost: [C],
      damage: 0,
      text: 'Put a Pokémon from your discard pile into your hand.'
    },
    {
      name: 'Tackle',
      cost: [P, C],
      damage: 30,
      text: ''
    }
  ];

  public set: string = 'SCR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '57';
  public name: string = 'Slowpoke';
  public fullName: string = 'Slowpoke SCR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const hasCardInDiscard = player.discard.cards.some(c => {
        return c instanceof Card;
      });
      if (!hasCardInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      return store.prompt(state, [
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          { superType: SuperType.POKEMON },
          { min: 1, max: 1, allowCancel: false }
        )], selected => {
          const cards = new CardList();
          if (selected) {
            cards.cards = selected;
          }
          MOVE_CARDS(store, state, cards, player.hand);
        });
    }

    return state;
  }
}

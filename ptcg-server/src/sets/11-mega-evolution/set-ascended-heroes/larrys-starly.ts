import {
  PokemonCard,
  Stage,
  CardTag,
  CardType,
  StoreLike,
  State,
  ChooseCardsPrompt,
  GameMessage,
  SuperType,
  EnergyType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class LarrysStarly extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.LARRYS];
  public cardType: CardType[] = [C];
  public hp: number = 60;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Minor Errand-Running',
      cost: [C],
      damage: 0,
      text: 'Search your deck for up to 2 Basic Energy cards, reveal them, and put them into your hand. Then, shuffle your deck.',
    },
    {
      name: 'Glide',
      cost: [C],
      damage: 10,
      text: '',
    },
  ];

  public regulationMark = 'I';
  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '168';
  public name: string = "Larry's Starly";
  public fullName: string = "Larry's Starly MC";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 0, max: 2, allowCancel: false },
        ),
        (selected) => {
          const cards = selected || [];
          cards.forEach((card) => {
            MOVE_CARDS(store, state, player.deck, player.hand, { cards: [card], sourceCard: this });
          });
          SHUFFLE_DECK(store, state, player);
        },
      );
    }
    return state;
  }
}

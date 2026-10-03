import {
  PokemonCard,
  Stage,
  CardType,
  CardTag,
  GameMessage,
  State,
  StoreLike,
  ChooseCardsPrompt,
  ShuffleDeckPrompt,
  SuperType,
  TrainerType,
  GameError,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import {THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MagnezoneVSTAR extends PokemonCard {
  public stage: Stage = Stage.VSTAR;

  public evolvesFrom = 'Magnezone V';

  public cardType: CardType[] = [CardType.LIGHTNING];

  protected _tags = [CardTag.POKEMON_VSTAR];

  public hp: number = 270;

  public weakness = [{ type: CardType.FIGHTING }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Magnetic Grip',
      cost: [CardType.LIGHTNING, CardType.COLORLESS, CardType.COLORLESS],
      damage: 180,
      text: 'Search your deck for up to 2 Item cards, reveal them, and put them into your hand. Then, shuffle your deck.',
    },
    {
      name: 'Splitting Beam',
      cost: [CardType.LIGHTNING, CardType.LIGHTNING],
      damage: 0,
      text: "This attack does 90 damage to 2 of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.) (You can't use more than 1 VSTAR Power in a game.)",
    },
  ];

  public set: string = 'LOR';

  public regulationMark = 'F';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '57';

  public name: string = 'Magnezone VSTAR';

  public fullName: string = 'Magnezone VSTAR LOR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.deck,
          { superType: SuperType.TRAINER, trainerType: TrainerType.ITEM },
          { min: 0, max: 2, allowCancel: true },
        ),
        (cards) => {
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: this });

          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
          });
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      if (player.usedVSTAR === true) {
        throw new GameError(GameMessage.LABEL_VSTAR_USED);
      }
      player.usedVSTAR = true;
      THIS_ATTACK_DOES_X_DAMAGE_TO_X_OF_YOUR_OPPONENTS_POKEMON(90, effect, store, state, 0, 2);
    }
    return state;
  }
}

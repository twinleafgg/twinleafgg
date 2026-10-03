import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  SuperType,
  EnergyType,
  CardTag,
} from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, ChooseCardsPrompt, ShuffleDeckPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class SingleStrikeUrshifuV extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_V, CardTag.SINGLE_STRIKE];
  public cardType: CardType[] = [F];
  public hp: number = 220;
  public weakness = [{ type: P }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Laser Focus',
      cost: [F],
      damage: 0,
      text: 'Search your deck for up to 2 [F] Energy cards and attach them to this Pokémon. Then, shuffle your deck.',
    },
    {
      name: 'Impact Blow',
      cost: [F, F, C],
      damage: 180,
      text: "During your next turn, this Pokémon can't use Impact Blow.",
    },
  ];

  public regulationMark = 'E';
  public set: string = 'BST';
  public setNumber: string = '85';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Single Strike Urshifu V';
  public fullName: string = 'Single Strike Urshifu V BST';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const cardList = StateUtils.findCardList(state, this);
      if (cardList === undefined) {
        return state;
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_ATTACH,
          player.deck,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fighting Energy' },
          { min: 0, max: 2, allowCancel: true },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.deck, cardList, { cards: cards, sourceCard: this });
          }
          return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
          });
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      if (!player.active.cannotUseAttacksNextTurnPending.includes('Impact Blow')) {
        player.active.cannotUseAttacksNextTurnPending.push('Impact Blow');
      }
    }
    return state;
  }
}

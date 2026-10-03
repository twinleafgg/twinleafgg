import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import {
  PokemonCard,
  StoreLike,
  State,
  ChooseCardsPrompt,
  GameMessage,
  ShuffleDeckPrompt,
} from '../../../game';
import { EnergyCard } from '../../../game/store/card/energy-card';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Quilladin extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Chespin';
  public hp: number = 100;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Leafy Charge',
      cost: [G],
      damage: 20,
      text: 'Search your deck for 1 Basic [G] Energy card and attach it to this Pokémon. Then, shuffle your deck.',
    },
    {
      name: 'Vine Whip',
      cost: [G, G, C],
      damage: 80,
      text: '',
    },
  ];

  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Quilladin';
  public fullName: string = 'Quilladin M4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const blocked: number[] = [];
      player.deck.cards.forEach((c, i) => {
        if (!(c instanceof EnergyCard)) blocked.push(i);
        else if (c.energyType !== EnergyType.BASIC) blocked.push(i);
        else if (!c.provides.includes(G)) blocked.push(i);
      });
      const hasBasicG = player.deck.cards.some(
        (c) =>
          c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.provides.includes(G),
      );
      if (!hasBasicG) {
        return state;
      }
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_ATTACH,
          player.deck,
          { superType: SuperType.ENERGY },
          { min: 1, max: 1, allowCancel: false, blocked },
        ),
        (selected) => {
          const cards = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, player.deck, player.active, { cards: [cards[0]], sourceCard: this });
            return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
              player.deck.applyOrder(order);
            });
          }
          return state;
        },
      );
    }
    return state;
  }
}

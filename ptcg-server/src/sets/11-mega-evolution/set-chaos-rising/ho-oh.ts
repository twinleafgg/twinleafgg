import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import {
  PokemonCard,
  StoreLike,
  State,
  ChooseCardsPrompt,
  GameMessage,
  PokemonCardList,
} from '../../../game';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';

export class HoOh extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 130;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Flames of Revival',
      cost: [R],
      damage: 0,
      text: 'Put up to 3 Basic Pokémon from your discard pile onto your Bench.',
    },
    {
      name: 'Bright Wing',
      cost: [R, R, R],
      damage: 130,
      text: 'Discard a [R] Energy attached to this Pokémon.',
    },
  ];

  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Ho-Oh';
  public fullName: string = 'Ho-Oh M4';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);
      if (slots.length === 0) {
        return state;
      }
      const basicInDiscard = player.discard.cards.filter(
        (c) => c instanceof PokemonCard && (c as PokemonCard).stage === Stage.BASIC,
      );
      if (basicInDiscard.length === 0) {
        return state;
      }
      const max = Math.min(3, slots.length, basicInDiscard.length);
      const blocked: number[] = [];
      player.discard.cards.forEach((c, index) => {
        if (!(c instanceof PokemonCard) || (c as PokemonCard).stage !== Stage.BASIC) {
          blocked.push(index);
        }
      });
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
          player.discard,
          { superType: SuperType.POKEMON, stage: Stage.BASIC },
          { min: 0, max, allowCancel: true, blocked },
        ),
        (selected) => {
          const cards = selected || [];
          cards.forEach((card, index) => {
            if (index < slots.length) {
              MOVE_CARDS(store, state, player.discard, slots[index], { cards: [card], sourceCard: this });
              slots[index].pokemonPlayedTurn = state.turn;
            }
          });
        },
      );
    }
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1, CardType.FIRE);
    }
    return state;
  }
}

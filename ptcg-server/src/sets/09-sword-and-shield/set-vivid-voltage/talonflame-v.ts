import {
  Attack,
  CardTag,
  CardType,
  PokemonCard,
  Resistance,
  Stage,
  State,
  StoreLike,
  Weakness,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import {DRAW_CARDS, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TalonflameV extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_V];
  public cardType: CardType[] = [R];
  public hp: number = 190;
  public weakness: Weakness[] = [{ type: L }];
  public resistance: Resistance[] = [{ type: F, value: -30 }];
  public retreat: CardType[] = [];

  public attacks: Attack[] = [
    {
      name: 'Fast Flight',
      cost: [C],
      damage: 0,
      canUseOnFirstTurn: true,
      text: 'If you go first, you can use this attack during your first turn. Discard your hand and draw 6 cards.',
    },
    {
      name: 'Bright Wing',
      cost: [R, R, C],
      damage: 160,
      text: 'Discard an Energy from this Pokémon.',
    },
  ];

  public set: string = 'VIV';
  public regulationMark: string = 'D';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '29';
  public name: string = 'Talonflame V';
  public fullName: string = 'Talonflame V VIV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    const player = state.players[state.activePlayer];

    if (WAS_ATTACK_USED(effect, 0, this)) {
      MOVE_CARDS(store, state, player.hand, player.discard, { count: player.hand.cards.length, sourceCard: this });
      DRAW_CARDS(store, state, player, 6);
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1);
    }

    return state;
  }
}

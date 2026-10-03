import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt, GameMessage, PokemonCard, StateUtils } from '../../../game';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MegaAbsolex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public hp: number = 280;
  public cardType: CardType[] = [D];
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Terminal Period',
      cost: [D, C],
      damage: 0,
      text: "If your opponent's Active Pokémon has exactly 6 damage counters on it, that Pokémon is Knocked Out.",
    },
    {
      name: 'Claw of Darkness',
      cost: [D, D, C],
      damage: 200,
      text: 'Your opponent reveals their hand, and you discard a card you find there.',
    },
  ];

  public set: string = 'MEG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '86';
  public name: string = 'Mega Absol ex';
  public fullName: string = 'Mega Absol ex M1L';
  public regulationMark: string = 'I';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (opponent.active.damage === 60) {
        opponent.active.damage += 999;
      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.hand.cards.length == 0) {
        return state;
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          opponent.hand,
          {},
          { allowCancel: false, min: 1, max: 1 },
        ),
        (selectedCard) => {
          const selected = selectedCard || [];
          if (selectedCard === null || selected.length === 0) {
            return;
          }

          MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: [selected[0]], sourceCard: this });
        },
      );
    }

    return state;
  }
}

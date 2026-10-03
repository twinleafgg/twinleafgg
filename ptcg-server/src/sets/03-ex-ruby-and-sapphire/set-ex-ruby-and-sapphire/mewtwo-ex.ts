import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Mewtwoex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [P];
  public hp: number = 100;
  public weakness = [{ type: P }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Energy Absorption',
      cost: [P],
      damage: 0,
      text: 'Attach up to 2 Energy cards from your discard pile to Mewtwo ex.',
    },
    {
      name: 'Psyburn',
      cost: [P, P, C],
      damage: 60,
      text: '',
    },
  ];

  public set: string = 'RS';
  public setNumber: string = '101';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mewtwo ex';
  public fullName: string = 'Mewtwo ex RS 10';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 1: Energy Absorption
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const energyCards = player.discard.cards.filter((c) => c.superType === SuperType.ENERGY);

      if (energyCards.length === 0) {
        return state;
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_ATTACH,
          player.discard,
          { superType: SuperType.ENERGY },
          { min: 0, max: 2, allowCancel: false },
        ),
        (selected) => {
          if (selected && selected.length > 0) {
            MOVE_CARDS(store, state, player.discard, player.active, { cards: [selected[0]], sourceCard: this });
          }
        },
      );
    }

    return state;
  }
}

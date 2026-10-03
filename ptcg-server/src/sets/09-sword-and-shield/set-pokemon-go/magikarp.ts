import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameMessage, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Magikarp extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [W];
  public hp: number = 30;
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Lively Grouping',
      cost: [C],
      damage: 0,
      text: 'Search your deck for any number of Magikarp, reveal them, and put them into your hand. Then, shuffle your deck.'
    },
    {
      name: 'Raging Fin',
      cost: [C, C],
      damage: 10,
      damageCalculation: '+',
      text: 'This attack does 30 more damage for each Magikarp and Gyarados in your discard pile.'
    }
  ];

  public regulationMark = 'F';
  public set: string = 'PGO';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '21';
  public name: string = 'Magikarp';
  public fullName: string = 'Magikarp PGO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Lively Grouping
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.POKEMON, name: 'Magikarp' },
        { min: 0, allowCancel: false }
      ), selected => {
        if (selected && selected.length > 0) {
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: selected, sourceCard: this });

          SHOW_CARDS_TO_PLAYER(store, state, effect.opponent, selected);
          SHUFFLE_DECK(store, state, player);
        } else {
          SHUFFLE_DECK(store, state, player);
        }
      });
    }

    // Raging Fin
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      let karpsInDiscard = 0;

      player.discard.cards.forEach(card => {
        if (card instanceof PokemonCard && (card.name === 'Magikarp' || card.name === 'Gyarados')) {
          karpsInDiscard++;
        }
      });

      effect.damage += karpsInDiscard * 30;
    }

    return state;
  }
}
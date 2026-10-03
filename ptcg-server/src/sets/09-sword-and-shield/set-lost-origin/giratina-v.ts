import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { CardList } from '../../../game/store/state/card-list';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { GameMessage } from '../../../game/game-message';
import { PokemonCard, StateUtils } from '../../../game';

import { ApplyWeaknessEffect, AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class GiratinaV extends PokemonCard {
  public stage: Stage = Stage.BASIC;

  protected _tags = [CardTag.POKEMON_V];

  public regulationMark = 'F';

  public cardType: CardType[] = [CardType.DRAGON];

  public hp: number = 220;

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Abyss Seeking',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: 'Look at the top 4 cards of your deck and put 2 of them into your hand. Put the other cards in the Lost Zone.',
    },
    {
      name: 'Shred',
      cost: [CardType.GRASS, CardType.PSYCHIC, CardType.COLORLESS],
      damage: 160,
      shredAttack: true,
      text: "This attack's damage isn't affected by any effects on your opponent's Active Pokémon.",
    },
  ];

  public set: string = 'LOR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '130';

  public name: string = 'Giratina V';

  public fullName: string = 'Giratina V LOR';

  public readonly FLOWER_SELECTING_MARKER = 'FLOWER_SELECTING_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 4, sourceCard: this });

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          deckTop,
          {},
          { min: 2, max: 2, allowCancel: true },
        ),
        (selected) => {
          MOVE_CARDS(store, state, deckTop, player.hand, { cards: selected, sourceCard: this });
          MOVE_CARDS(store, state, deckTop, player.lostzone, { sourceCard: this });
          return state;
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const applyWeakness = new ApplyWeaknessEffect(effect, 160);
      store.reduceEffect(state, applyWeakness);
      const damage = applyWeakness.damage;

      effect.damage = 0;

      if (damage > 0) {
        opponent.active.damage += damage;
        const afterDamage = new AfterDamageEffect(effect, damage);
        state = store.reduceEffect(state, afterDamage);
      }
    }
    return state;
  }
}

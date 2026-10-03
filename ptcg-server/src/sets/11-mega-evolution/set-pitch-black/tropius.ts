import { CardList } from '../../../game/store/state/card-list';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import { GameMessage } from '../../../game/game-message';
import {SHOW_CARDS_TO_PLAYER,
  SHUFFLE_DECK,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { State, StateUtils } from '../../../game';
import { StoreLike } from '../../../game/store/store-like';

export class Tropius extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [G];
  public hp: number = 110;
  public weakness = [{ type: R }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Fruity Aroma',
      cost: [C],
      damage: 0,
      text: 'Look at the top 6 cards of your deck, and you may reveal any number of Pokémon you find there and put them into your hand. Shuffle the other cards back into your deck.',
    },
    {
      name: 'Solar Beam',
      cost: [G, C],
      damage: 60,
      text: '',
    },
  ];

  public set: string = 'PBL';
  public setNumber: string = '1';
  public regulationMark: string = 'J';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Tropius';
  public fullName: string = 'Tropius M5';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ref: set-shining-fates/manaphy.ts (Ocean Search — top deck to CardList + optional Pokémon picks)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.deck.cards.length === 0) {
        return state;
      }

      const opponent = StateUtils.getOpponent(state, player);
      const topCards = new CardList();
      const count = Math.min(6, player.deck.cards.length);
      MOVE_CARDS(store, state, player.deck, topCards, { count: count, sourceCard: this });

      const looked = [...topCards.cards];
      SHOW_CARDS_TO_PLAYER(store, state, player, looked);
      SHOW_CARDS_TO_PLAYER(store, state, opponent, looked);

      const pokemonInPreview = looked.filter((c) => c instanceof PokemonCard).length;

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          topCards,
          { superType: SuperType.POKEMON },
          { min: 0, max: pokemonInPreview, allowCancel: false },
        ),
        (selected) => {
          const pokemonTaken = selected || [];
          if (pokemonTaken.length > 0) {
            SHOW_CARDS_TO_PLAYER(store, state, opponent, pokemonTaken);
            MOVE_CARDS(store, state, topCards, player.hand, { cards: pokemonTaken, sourceCard: this });
          }
          MOVE_CARDS(store, state, topCards, player.deck, { sourceCard: this });
          SHUFFLE_DECK(store, state, player);
        },
      );
    }

    return state;
  }
}

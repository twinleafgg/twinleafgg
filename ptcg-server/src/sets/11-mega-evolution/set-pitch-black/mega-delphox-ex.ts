import { CardList, GameMessage, StateUtils, StoreLike, State } from '../../../game';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  CardTag,
  CardType,
  SpecialCondition,
  Stage,
  SuperType,
} from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';
import {WAS_ATTACK_USED,
  SHOW_CARDS_TO_PLAYER,
  SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MegaDelphoxex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Braixen';
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public cardType: CardType[] = [R];
  public hp: number = 350;
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [
    {
      name: 'Trick Portal',
      cost: [R],
      damage: 0,
      text: 'Look at the top 9 cards of your deck, and you may put any number of Pokémon you find there onto your Bench. Shuffle the other cards back into your deck.',
    },
    {
      name: 'Eerie Glow',
      cost: [R, C, C],
      damage: 200,
      text: "Your opponent's Active Pokémon is now Burned and Confused.",
    },
  ];

  public regulationMark: string = 'J';
  public set: string = 'PBL';
  public setNumber: string = '8';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mega Delphox ex';
  public fullName: string = 'Mega Delphox ex M-P';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Trick Portal
    // Ref: set-cosmic-eclipse/wishiwashi-gx.ts (Massive Catch-GX)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: Math.min(9, player.deck.cards.length), sourceCard: this });

      SHOW_CARDS_TO_PLAYER(store, state, player, deckTop.cards);

      const openSlots = player.bench.filter((b) => b.cards.length === 0).length;
      const basicCount = deckTop.cards.filter(
        (c) => c instanceof PokemonCard && c.stage === Stage.BASIC,
      ).length;

      if (basicCount === 0 || openSlots === 0) {
        MOVE_CARDS(store, state, deckTop, player.deck, { sourceCard: this });
        SHUFFLE_DECK(store, state, player);
        return state;
      }

      const maxToSelect = Math.min(basicCount, openSlots);

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
          deckTop,
          { superType: SuperType.POKEMON, stage: Stage.BASIC },
          { min: 0, max: maxToSelect, allowCancel: false },
        ),
        (selected) => {
          const cards = selected || [];
          cards.forEach((card) => {
            const emptySlot = player.bench.find((b) => b.cards.length === 0);
            if (emptySlot) {
              MOVE_CARDS(store, state, deckTop, emptySlot, { cards: [card], sourceCard: this });
              emptySlot.pokemonPlayedTurn = state.turn;
            }
          });
          MOVE_CARDS(store, state, deckTop, player.deck, { sourceCard: this });
          SHUFFLE_DECK(store, state, player);
        },
      );
    }

    // Eerie Glow
    // Ref: set-lost-origin/delphox-v.ts (Eerie Glow)
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      const active = opponent.active;
      active.addSpecialCondition(SpecialCondition.BURNED);
      active.addSpecialCondition(SpecialCondition.CONFUSED);
    }

    return state;
  }
}

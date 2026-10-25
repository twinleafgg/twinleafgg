import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { CONFIRMATION_PROMPT, DRAW_CARDS, SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Luvdisc extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +10 }];
  public retreat = [C];

  public attacks = [{
    name: 'Love Call',
    cost: [],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. Search your deck for a Pokémon that is the same type as the Pokémon you chose, show it to your opponent, and put it into your hand. Shuffle your deck afterward.'
  }, {
    name: 'Sweet Kiss',
    cost: [W],
    damage: 30,
    text: 'Your opponent may draw a card.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '35';
  public name: string = 'Luvdisc';
  public fullName: string = 'Luvdisc PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Love Call
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.deck.cards.length === 0) {
        return state;
      }

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const target = selected[0];
        const checkType = new CheckPokemonTypeEffect(target);
        store.reduceEffect(state, checkType);
        const types = checkType.cardTypes;

        const blocked: number[] = [];
        player.deck.cards.forEach((card, index) => {
          if (!(card instanceof PokemonCard) || !card.cardType.some(t => types.includes(t))) {
            blocked.push(index);
          }
        });

        SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_INTO_HAND(
          store,
          state,
          player,
          {},
          { min: 0, max: 1, allowCancel: true, blocked }
        );
      });
    }

    // Sweet Kiss
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const opponent = effect.opponent;
      if (opponent.deck.cards.length > 0) {
        return CONFIRMATION_PROMPT(store, state, opponent, result => {
          if (result) {
            DRAW_CARDS(store, state, opponent, 1);
          }
        }, GameMessage.WANT_TO_DRAW_CARDS);
      }
    }

    return state;
  }
}

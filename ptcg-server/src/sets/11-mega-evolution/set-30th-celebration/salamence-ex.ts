import { PokemonCard, Stage, CardTag, CardType, StoreLike, State, PokemonCardList, pokemonHasCardType, ChooseCardsPrompt, GameMessage, SuperType } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import {WAS_ATTACK_USED, DISCARD_TOP_X_CARDS_FROM_YOUR_DECK, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class Salamenceex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  protected _tags = [CardTag.POKEMON_ex];
  public evolvesFrom: string = 'Shelgon';
  public hp: number = 320;
  public cardType: CardType[] = [N];
  public weakness = [];
  public resistance = [];
  public retreat = [C, C];

  public attacks = [{
    name: 'Booming Call',
    cost: [C],
    damage: 0,
    text: 'Put up to 3 [N] Pokémon from your discard pile onto your Bench.'
  },
  {
    name: 'Dragon Pulse',
    cost: [R, W],
    damage: 240,
    text: 'Discard the top 2 cards of your deck.'
  }];

  public regulationMark: string = 'J';
  public set: string = '30C';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '109';
  public name: string = 'Salamence ex';
  public fullName: string = 'Salamence ex 30C';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Booming Call
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);
      if (slots.length === 0) {
        return state;
      }

      const dragonInDiscard = player.discard.cards.filter(
        (c) => c instanceof PokemonCard && pokemonHasCardType(c, CardType.DRAGON),
      );

      if (dragonInDiscard.length === 0) {
        return state;
      }

      const max = Math.min(3, slots.length, dragonInDiscard.length);
      const blocked: number[] = [];
      player.discard.cards.forEach((c, index) => {
        if (!(c instanceof PokemonCard) || !pokemonHasCardType(c, CardType.DRAGON)) {
          blocked.push(index);
        }
      });

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
          player.discard,
          { superType: SuperType.POKEMON, cardType: [CardType.DRAGON] },
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

    // Dragon Pulse
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_TOP_X_CARDS_FROM_YOUR_DECK(store, state, effect.player, 2, this, effect);
    }

    return state;
  }
}

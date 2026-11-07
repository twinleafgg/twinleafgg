import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { PutCountersEffect } from '../../../game/store/effects/attack-effects';
import { SHOW_CARDS_TO_PLAYER, MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { Stage, CardType, StoreLike, State, CardList, ChooseCardsPrompt, GameMessage, SuperType, ChoosePokemonPrompt, PlayerType, SlotType } from '../../../game';

export class Sableye extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [D];
  public hp: number = 80;
  public weakness = [{ type: G }];
  public retreat = [C];

  public attacks = [{
    name: 'Lure Out',
    cost: [D],
    damage: 0,
    text: 'Reveal the top 5 cards of your opponent\'s deck. You may choose any number of Basic Pokémon you find there and put those Pokémon onto their Bench. Your opponent shuffles the other cards back into their deck.',
  },
  {
    name: 'Ominous Eyes',
    cost: [D, C],
    damage: 0,
    text: 'Put 5 damage counters on 1 of your opponent\'s Pokémon.',
  }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public setNumber: string = '60';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Sableye';
  public fullName: string = 'Sableye M6';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Lure Out
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      if (opponent.deck.cards.length === 0) {
        return state;
      }

      const openSlots = opponent.bench.filter(b => b.cards.length === 0);
      const deckTop = new CardList();
      state = MOVE_CARDS(store, state, opponent.deck, deckTop, {
        count: Math.min(5, opponent.deck.cards.length),
        sourceCard: this,
        sourceEffect: this.attacks[0],
      });

      SHOW_CARDS_TO_PLAYER(store, state, player, deckTop.cards);

      if (openSlots.length === 0) {
        state = MOVE_CARDS(store, state, deckTop, opponent.deck, {
          sourceCard: this,
          sourceEffect: this.attacks[0],
        });
        return SHUFFLE_DECK(store, state, opponent);
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
        deckTop,
        { superType: SuperType.POKEMON, stage: Stage.BASIC },
        { min: 0, max: openSlots.length, allowCancel: false },
      ), selected => {
        const cards = selected || [];

        cards.forEach((card, index) => {
          state = MOVE_CARDS(store, state, deckTop, openSlots[index], {
            cards: [card],
            sourceCard: this,
            sourceEffect: this.attacks[0],
          });
          openSlots[index].pokemonPlayedTurn = state.turn;
        });

        state = MOVE_CARDS(store, state, deckTop, opponent.deck, {
          sourceCard: this,
          sourceEffect: this.attacks[0],
        });
        SHUFFLE_DECK(store, state, opponent);
      });
    }

    // Sinister Eyes
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return store.prompt(state, new ChoosePokemonPrompt(
        effect.player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { allowCancel: false },
      ), targets => {
        if (!targets || targets.length === 0) {
          return;
        }
        const damageEffect = new PutCountersEffect(effect, 50);
        damageEffect.target = targets[0];
        store.reduceEffect(state, damageEffect);
      });
    }

    return state;
  }
}

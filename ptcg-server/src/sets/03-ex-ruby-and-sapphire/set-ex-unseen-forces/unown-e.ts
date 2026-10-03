import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import {
  StoreLike, State, StateUtils, GameMessage,
  PowerType,
  PokemonCardList,
  GameError,
  ChooseCardsPrompt,
  GameLog
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {ADD_MARKER, HAS_MARKER, REMOVE_MARKER_AT_END_OF_TURN, SHUFFLE_DECK, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class UnownE extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 60;
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers = [{
    name: 'Shuffle',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may search your deck for another Unown and switch it with Unown. (Any cards attached to Unown, damage counters, Special Conditions, and effects on it are now on the new Pokémon.) If you do, put Unown on top of your deck. Shuffle your deck afterward. You can\'t use more than 1 Shuffle Poké-Power each turn.'
  }];

  public attacks = [{
    name: 'Hidden Power',
    cost: [C],
    damage: 0,
    text: 'If your opponent\'s Bench isn\'t full, look at his or her hand. Choose 1 Basic Pokémon you find there and put it onto your opponent\'s Bench. Then, switch it with the Defending Pokémon. Your opponent chooses the Defending Pokémon to switch.'
  }];

  public set: string = 'UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'E';
  public name: string = 'Unown';
  public fullName: string = 'Unown UF';

  public readonly SHUFFLE_MARKER = 'SHUFFLE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.SHUFFLE_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const targetCardList = StateUtils.findCardList(state, this);

      if (!(targetCardList instanceof PokemonCardList)) {
        throw new GameError(GameMessage.INVALID_TARGET);
      }

      if (HAS_MARKER(this.SHUFFLE_MARKER, player)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blocked: number[] = [];

      player.deck.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.name !== 'Unown') {
          blocked.push(index);
        }
      });

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_POKEMON_TO_SWITCH,
        player.deck,
        { superType: SuperType.POKEMON },
        { min: 1, max: 1, allowCancel: true, blocked },
      ), (selection) => {
        if (selection.length <= 0) {
          return state;
        }

        const pokemonCard = selection[0];

        if (!(pokemonCard instanceof PokemonCard)) {
          return state;
        }
        store.log(state, GameLog.LOG_PLAYER_TRANSFORMS_INTO_POKEMON, {
          name: player.name,
          pokemon: this.name,
          card: pokemonCard.name,
          effect: effect.power.name,
        });
        MOVE_CARDS(store, state, player.deck, targetCardList, { cards: [pokemonCard], sourceCard: this });
        MOVE_CARDS(store, state, targetCardList, player.deck, { cards: [this], sourceCard: this });

        SHUFFLE_DECK(store, state, player);
        ADD_MARKER(this.SHUFFLE_MARKER, player, this);
      });
    }

    // Hidden Power
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const slots: PokemonCardList[] = opponent.bench.filter(b => b.cards.length === 0);

      if (slots.length === 0) {
        // No open slots, return state
        return state;
      }

      if (opponent.hand.cards.length === 0) {
        return state;
      }

      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_BASIC_POKEMON_TO_BENCH,
        opponent.hand,
        { superType: SuperType.POKEMON, stage: Stage.BASIC },
        { min: 0, max: 1, allowCancel: true }
      ), selected => {
        const cards = selected || [];

        // Operation canceled by the user
        if (cards.length === 0) {
          return state;
        }

        cards.forEach((card, index) => {
          MOVE_CARDS(store, state, opponent.hand, slots[index], { cards: [card], sourceCard: this });
          slots[index].pokemonPlayedTurn = state.turn;

          opponent.switchPokemon(slots[index]);
        });
      });
    }

    return state;
  }
}
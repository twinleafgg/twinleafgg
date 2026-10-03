import { ChooseCardsPrompt, GameMessage, State, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonFromDeckEffect } from '../../../game/store/effects/play-card-effects';
import { AfterAttackEffect } from '../../../game/store/effects/game-phase-effects';
import { ADD_PARALYZED_TO_PLAYER_ACTIVE, COIN_FLIP_PROMPT, CONFIRMATION_PROMPT, SHUFFLE_DECK, SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Dunsparce extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 50;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Strike and Run',
    cost: [C],
    damage: 0,
    text: 'Search your deck for up to 3 Basic Pokémon and put them onto your Bench. Then, shuffle your deck. If you put any Pokémon onto your Bench in this way, you may switch this Pokémon with 1 of your Benched Pokémon.'
  }, {
    name: 'Sudden Flash',
    cost: [C],
    damage: 10,
    text: 'Flip a coin. If heads, your opponent\'s Active Pokémon is now Paralyzed.'
  }];

  public set: string = 'SS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '60';
  public name: string = 'Dunsparce';
  public fullName: string = 'Dunsparce SS';

  public wantsToSwitch: boolean = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const openSlots = player.bench.filter(b => b.cards.length === 0);

      if (player.deck.cards.length === 0 || openSlots.length === 0) {
        return state;
      }

      const maxPokemons = Math.min(openSlots.length, 3);

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
        player.deck,
        { superType: SuperType.POKEMON, stage: Stage.BASIC },
        { min: 0, max: Math.min(3, maxPokemons), allowCancel: false }
      ), selectedCards => {
        const cards = selectedCards || [];

        cards.forEach((card, index) => {
          store.reduceEffect(state, new PlayPokemonFromDeckEffect(player, card as PokemonCard, openSlots[index]));
        });

        SHUFFLE_DECK(store, state, player);
        this.wantsToSwitch == true;
      });
    }

    if (effect instanceof AfterAttackEffect && this.wantsToSwitch) {
      const player = effect.player;
      CONFIRMATION_PROMPT(store, state, player, result => {
        if (result) { SWITCH_ACTIVE_WITH_BENCHED(store, state, player); }
      });
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) { ADD_PARALYZED_TO_PLAYER_ACTIVE(store, state, effect.opponent, this); }
      });
    }

    return state;
  }
}
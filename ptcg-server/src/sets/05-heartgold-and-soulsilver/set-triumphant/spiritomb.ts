import { ConfirmPrompt, GameMessage, PlayerType, PowerType, SelectPrompt, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PutCountersEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {DRAW_CARDS, IS_POKEPOWER_BLOCKED, SHUFFLE_DECK, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Spiritomb extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 60;
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Spooky Whirlpool',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you put Spiritomb from your hand onto your Bench, you may use this power. Your opponent shuffles his or her hand into his or her deck and draws 6 cards.'
  }];

  public attacks = [{
    name: 'Color Tag',
    cost: [P],
    damage: 0,
    text: 'Choose [G], [R], [W], [L], [P], [F], [D], [M], or [C] type. Put 1 damage counter on each Pokémon your opponent has in play of the type you chose.'
  }];

  public set: string = 'TM';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '10';
  public name: string = 'Spiritomb';
  public fullName: string = 'Spiritomb TM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {
          const powerEffect = new PowerEffect(player, this.powers[0], this);
          store.reduceEffect(state, powerEffect);

          MOVE_CARDS(store, state, opponent.hand, opponent.deck, { sourceCard: this });
          SHUFFLE_DECK(store, state, opponent);
          DRAW_CARDS(store, state, opponent, 6);
        }

        return state;
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      const options = [
        { value: CardType.COLORLESS, message: 'Colorless' },
        { value: CardType.DARK, message: 'Dark' },
        { value: CardType.FIGHTING, message: 'Fighting' },
        { value: CardType.FIRE, message: 'Fire' },
        { value: CardType.GRASS, message: 'Grass' },
        { value: CardType.LIGHTNING, message: 'Lightning' },
        { value: CardType.METAL, message: 'Metal' },
        { value: CardType.PSYCHIC, message: 'Psychic' },
        { value: CardType.WATER, message: 'Water' }
      ];

      return store.prompt(state, new SelectPrompt(
        player.id,
        GameMessage.CHOOSE_ENERGY_TYPE,
        options.map(c => c.message),
        { allowCancel: false }
      ), choice => {

        // Inside PowerEffect block after selecting energy type
        const option = options[choice];

        if (!option) {
          return state;
        }

        opponent.forEachPokemon(PlayerType.TOP_PLAYER, target => {
          const checkPokemonTypeEffect = new CheckPokemonTypeEffect(target);
          store.reduceEffect(state, checkPokemonTypeEffect);

          if (checkPokemonTypeEffect.cardTypes.includes(option.value)) {
            const putCountersEffect = new PutCountersEffect(effect, 10);
            putCountersEffect.target = target;
            store.reduceEffect(state, putCountersEffect);
          }
        });
      });
    }

    return state;
  }
}
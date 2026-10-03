import {
  Attack,
  CardManager,
  GameError,
  GameMessage,
  PlayerType,
  PokemonCard,
  StateUtils,
} from '../../../game';
import { CardType, Stage, TrainerType } from '../../../game/store/card/card-types';
import { ColorlessCostReducer } from '../../../game/store/card/pokemon-interface';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import {
  CheckAttackCostEffect,
  CheckPokemonAttacksEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {DEVOLVE_POKEMON, IS_TOOL_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';

export class TechnicalMachineDevolution extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.TOOL;

  public regulationMark = 'G';

  protected _tags = [];

  public set: string = 'PAR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '177';

  public name: string = 'Technical Machine: Devolution';

  public fullName: string = 'Technical Machine: Devolution PAR';

  public attacks: Attack[] = [
    {
      name: 'Devolution',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: "Devolve each of your opponent's evolved Pokémon by putting the highest Stage Evolution card on it into your opponent's hand.",
    },
  ];

  public text: string =
    'The Pokémon this card is attached to can use the attack on this card. (You still need the necessary Energy to use this attack.) If this card is attached to 1 of your Pokémon, discard it at the end of your turn.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect) {
      const player = effect.player;

      if (IS_TOOL_BLOCKED(store, state, player, this)) {
        return state;
      }

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, index) => {
        if (cardList.tools && cardList.tools.includes(this)) {
          MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
        }
      });

      return state;
    }

    if (effect instanceof CheckAttackCostEffect && effect.attack === this.attacks[0]) {
      const pokemonCard = effect.player.active.getPokemonCard();
      if (pokemonCard && 'getColorlessReduction' in pokemonCard) {
        const reduction = (pokemonCard as ColorlessCostReducer).getColorlessReduction(state);
        for (let i = 0; i < reduction && effect.cost.includes(CardType.COLORLESS); i++) {
          const index = effect.cost.indexOf(CardType.COLORLESS);
          if (index !== -1) {
            effect.cost.splice(index, 1);
          }
        }
      }
    }

    if (
      effect instanceof CheckPokemonAttacksEffect &&
      effect.player.active.getPokemonCard()?.tools.includes(this) &&
      !effect.attacks.includes(this.attacks[0])
    ) {
      effect.attacks.push(this.attacks[0]);
    }

    if (effect instanceof AttackEffect && effect.attack === this.attacks[0]) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (IS_TOOL_BLOCKED(store, state, effect.player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }

      // Look through all known cards to find out if Pokemon can evolve
      const cm = CardManager.getInstance();
      const evolutions = cm.getAllCards().filter((c) => {
        return c instanceof PokemonCard && c.stage !== Stage.BASIC;
      }) as PokemonCard[];

      // Build possible evolution card names
      const evolutionNames: string[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (list, card, target) => {
        const valid = evolutions.filter((e) => e.evolvesFrom === card.name);
        valid.forEach((c) => {
          if (!evolutionNames.includes(c.name)) {
            evolutionNames.push(c.name);
          }
        });
      });

      if (opponent.active.getPokemonCard()) {
        const activePokemon = opponent.active.getPokemons();
        if (activePokemon.length > 0) {
          DEVOLVE_POKEMON(store, state, opponent.active, opponent.hand);
        }
      }

      opponent.bench.forEach((benchSpot) => {
        if (benchSpot.getPokemonCard()) {
          const benchPokemon = benchSpot.getPokemons();
          if (benchPokemon.length > 0) {
            DEVOLVE_POKEMON(store, state, benchSpot, opponent.hand);
          }
        }
      });
    }

    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import {ABILITY_USED, CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { StoreLike, State, PlayerType, ChoosePokemonPrompt, GameMessage, SlotType, CardTarget, PowerType, EnergyCard, AttachEnergyPrompt, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { PowerEffect } from '../../../game/store/effects/game-effects';

export class Jirachi extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 60;
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers = [{
    name: 'Stardust Song',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you put Jirachi from your hand onto your Bench, you may flip 3 coins. For each heads, search your discard pile for a [P] Energy card and attach it to Jirachi.'
  }];

  public attacks = [{
    name: 'Time Hollow',
    cost: [P],
    damage: 0,
    text: 'Choose a number of your opponent\'s Stage 1 or Stage 2 Evolved Pokémon up to the amount of Energy attached to Jirachi. Remove the highest Stage Evolution card from each of those Pokémon and put those cards back into your opponent\'s hand.'
  }];

  public set: string = 'CL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '11';
  public name: string = 'Jirachi';
  public fullName: string = 'Jirachi CL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;

      if (!player.discard.cards.some(c => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC && (c as EnergyCard).provides.includes(CardType.PSYCHIC))) {
        return state;
      }

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }

      CONFIRMATION_PROMPT(store, state, player, wantToUse => {
        if (wantToUse) {
          const powerEffect = new PowerEffect(player, this.powers[0], this);
          store.reduceEffect(state, powerEffect);

          const blocked: number[] = [];
          player.discard.cards.forEach((c, index) => {
            if (!(c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC && (c as EnergyCard).provides.includes(CardType.PSYCHIC))) {
              blocked.push(index);
            }
          });

          ABILITY_USED(player, this);

          let heads: number = 0;
          MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, results => {
            results.forEach(r => {
              if (r) heads++;
            });

            const energyCount = Math.min(heads, player.discard.cards.filter(c => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC && (c as EnergyCard).provides.includes(CardType.PSYCHIC)).length);

            const blockedTo: CardTarget[] = [];
            player.bench.forEach((list, index) => {
              if (index !== effect.index) {
                blockedTo.push({
                  player: PlayerType.BOTTOM_PLAYER,
                  slot: SlotType.BENCH,
                  index
                });
              }
            });

            if (energyCount > 0) {
              state = store.prompt(state, new AttachEnergyPrompt(
                player.id,
                GameMessage.ATTACH_ENERGY_TO_BENCH,
                player.discard,
                PlayerType.BOTTOM_PLAYER,
                [SlotType.BENCH],
                { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Psychic Energy' },
                { allowCancel: false, min: energyCount, max: energyCount, blockedTo }
              ), transfers => {
                transfers = transfers || [];
                // cancelled by user
                if (transfers.length === 0) {
                  return;
                }

                for (const transfer of transfers) {
                  const target = StateUtils.getTarget(state, player, transfer.to);
                  MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
                }
              });
            }
          });
        }
      }, GameMessage.WANT_TO_USE_ABILITY);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let canDevolve = false;
      const blocked: CardTarget[] = [];
      effect.opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (list.getPokemons().length > 1 && (list.getPokemonCard()?.stage === Stage.STAGE_1 || list.getPokemonCard()?.stage === Stage.STAGE_2)) {
          canDevolve = true;
        } else {
          blocked.push(target);
        }
      });

      if (!canDevolve) {
        return state;
      }

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, player.active);
      state = store.reduceEffect(state, checkProvidedEnergy);

      if (checkProvidedEnergy.energyMap.length === 0) {
        return state;
      }

      store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { allowCancel: false, min: 0, max: checkProvidedEnergy.energyMap.length, blocked }
      ),
        (results) => {
          if (results && results.length > 0) {
            for (const targetPokemon of results) {
              const pokemons = targetPokemon.getPokemons();

              if (pokemons.length > 1) {
                const highestStagePokemon = pokemons[pokemons.length - 1];
                MOVE_CARDS(store, state, targetPokemon, effect.opponent.hand, { cards: [highestStagePokemon], sourceCard: this });
                targetPokemon.clearEffects();
                targetPokemon.pokemonPlayedTurn = state.turn;
              }
            }
          }

          return state;
        }
      );
    }

    return state;
  }
}


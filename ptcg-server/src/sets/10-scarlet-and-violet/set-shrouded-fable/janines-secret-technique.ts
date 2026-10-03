import { CardTarget, PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import {
  CardType,
  EnergyType,
  SpecialCondition,
  SuperType,
  TrainerType,
} from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  AttachEnergyPrompt,
  GameError,
  Player,
  StateUtils,
  pokemonHasCardType,
} from '../../../game';
import { SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class JaninesSecretTechnique extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public regulationMark = 'H';

  public set: string = 'SFA';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '59';

  public name: string = "Janine's Secret Art";

  public fullName: string = "Janine's Secret Technique SFA";

  public text: string =
    'Choose up to 2 of your [D] Pokémon. For each of those Pokémon, search your deck for a Basic [D] Energy card and attach it to that Pokémon. Then, shuffle your deck. If you attached Energy to your Active Pokémon in this way, it is now Poisoned.';

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }
    let hasDarkPokemon = false;
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
      if (pokemonHasCardType(card, CardType.DARK)) {
        hasDarkPokemon = true;
      }
    });
    if (!hasDarkPokemon) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      const supporterTurn = player.supporterTurn;

      if (supporterTurn > 0) {
        throw new GameError(GameMessage.SUPPORTER_ALREADY_PLAYED);
      }

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      let darkPokemonInPlay = false;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
        if (pokemonHasCardType(card, CardType.DARK)) {
          darkPokemonInPlay = true;
        }
      });

      if (!darkPokemonInPlay) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const blocked2: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (!pokemonHasCardType(card, CardType.DARK)) {
          blocked2.push(target);
        }
      });

      // return store.prompt(state, new ChoosePokemonPrompt(
      //   player.id,
      //   GameMessage.ATTACH_ENERGY_TO_BENCH,
      //   PlayerType.BOTTOM_PLAYER,
      //   [SlotType.BENCH, SlotType.ACTIVE],
      //   { min: 0, max: 2, blocked: blocked2 }
      // ), chosen => {

      //   chosen.forEach(target => {

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_ACTIVE,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Darkness Energy' },
          { allowCancel: false, min: 0, max: 2, blockedTo: blocked2, differentTargets: true },
        ),
        (transfers) => {
          transfers = transfers || [];

          if (transfers.length === 0) {
            SHUFFLE_DECK(store, state, player);
            return;
          }

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, {
              cards: [transfer.card],
              sourceCard: this,
            });

            if (target == player.active) {
              player.active.addSpecialCondition(SpecialCondition.POISONED);
            }
          }
          SHUFFLE_DECK(store, state, player);
        },
      );
    }
    return state;
  }
}

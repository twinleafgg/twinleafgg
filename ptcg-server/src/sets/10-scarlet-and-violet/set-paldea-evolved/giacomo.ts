import { TrainerCard } from '../../../game/store/card/trainer-card';
import { EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StoreLike } from '../../../game/store/store-like';
import { State } from '../../../game/store/state/state';
import { Effect } from '../../../game/store/effects/effect';
import { TrainerEffect } from '../../../game/store/effects/play-card-effects';
import {
  StateUtils,
  CardTarget,
  PlayerType,
  GameError,
  GameMessage,
  Player,
  PokemonCardList,
  ChoosePokemonPrompt,
  SlotType,
  Card,
  ChooseCardsPrompt,
} from '../../../game';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Giacomo extends TrainerCard {
  public regulationMark = 'G';

  protected _trainerType: TrainerType = TrainerType.SUPPORTER;

  public set: string = 'PAL';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '182';

  public name: string = 'Giacomo';

  public fullName: string = 'Giacomo PAL';

  public text: string = "Discard a Special Energy from each of your opponent's Pokémon.";

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    if (player.supporterTurn > 0) {
      return false;
    }

    const opponent = StateUtils.getOpponent(state, player);
    let hasPokemonWithSpecialEnergy = false;
    opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
      if (
        cardList.energies.cards.some(
          (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.SPECIAL,
        )
      ) {
        hasPokemonWithSpecialEnergy = true;
      }
    });
    return hasPokemonWithSpecialEnergy;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let oppSpecialPokemon = 0;
      let hasPokemonWithEnergy = false;
      const blocked: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (
          cardList.energies.cards.some(
            (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.SPECIAL,
          )
        ) {
          hasPokemonWithEnergy = true;
          oppSpecialPokemon++;
        } else {
          blocked.push(target);
        }
      });

      if (!hasPokemonWithEnergy) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

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

      let targets: PokemonCardList[] = [];
      store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DISCARD_CARDS,
          PlayerType.TOP_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: oppSpecialPokemon, max: oppSpecialPokemon, allowCancel: false, blocked },
        ),
        (results) => {
          targets = results || [];
        },
      );

      if (targets.length === 0) {
        return state;
      }

      const target = targets[0];
      let cards: Card[] = [];
      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          target,
          { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL },
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];
        },
      );

      if (cards.length > 0) {
        // Discard selected special energy card
        cards.forEach((card) => {
          MOVE_CARDS(store, state, target, opponent.discard, { cards: [card], sourceCard: this });
        });
      }

      return state;
    }
    return state;
  }
}

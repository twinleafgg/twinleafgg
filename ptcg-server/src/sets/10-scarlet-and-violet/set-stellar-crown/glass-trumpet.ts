import { CardTarget, PlayerType, SlotType } from '../../../game/store/actions/play-card-action';
import { GameMessage } from '../../../game/game-message';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import {
  CardTag,
  CardType,
  EnergyType,
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
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class GlassTrumpet extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public regulationMark = 'H';
  public set: string = 'SCR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '135';
  public name: string = 'Glass Trumpet';
  public fullName: string = 'Glass Trumpet SCR';

  public text: string = `You can use this card only if you have any Tera Pokémon in play.

Choose up to 2 of your Benched [C] Pokémon and attach a Basic Energy card from your discard pile to each of them.`;

  public canPlay(store: StoreLike, state: State, player: Player): boolean {
    const hasEnergyInDiscard = player.discard.cards.some(
      (c) => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC,
    );
    if (!hasEnergyInDiscard) {
      return false;
    }
    let teraPokemonInPlay = false;
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
      if (card.hasTag(CardTag.POKEMON_TERA)) {
        teraPokemonInPlay = true;
      }
    });
    if (!teraPokemonInPlay) {
      return false;
    }
    let hasColorlessBench = false;
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
      if (target.slot === SlotType.BENCH && pokemonHasCardType(card, CardType.COLORLESS)) {
        hasColorlessBench = true;
      }
    });
    if (!hasColorlessBench) {
      return false;
    }
    return true;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof TrainerEffect && effect.trainerCard === this) {
      const player = effect.player;

      MOVE_CARDS(store, state, player.hand, player.supporter, {
        cards: [effect.trainerCard],
        sourceCard: this,
      });
      // We will discard this card after prompt confirmation
      effect.preventDefault = true;

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC;
      });

      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      let teraPokemonInPlay = false;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
        if (card.hasTag(CardTag.POKEMON_TERA)) {
          teraPokemonInPlay = true;
        }
      });

      if (!teraPokemonInPlay) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const blocked2: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (!pokemonHasCardType(card, CardType.COLORLESS)) {
          blocked2.push(target);
        }
      });

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { allowCancel: false, min: 1, max: 2, blockedTo: blocked2, differentTargets: true },
        ),
        (transfers) => {
          transfers = transfers || [];

          if (transfers.length === 0) {
            return;
          }

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, {
              cards: [transfer.card],
              sourceCard: this,
            });
          }

          return state;
        },
      );
    }
    return state;
  }
}

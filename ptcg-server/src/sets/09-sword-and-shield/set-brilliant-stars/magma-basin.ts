import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CardType, EnergyType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { StateUtils } from '../../../game/store/state-utils';
import {
  AttachEnergyPrompt,
  PlayerType,
  SlotType,
  GameError,
  CardTarget,
  PokemonCard,
  pokemonHasCardType,
} from '../../../game';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';

export class MagmaBasin extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.STADIUM;
  public regulationMark = 'F';
  public set: string = 'BRS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '144';
  public name: string = 'Magma Basin';
  public fullName: string = 'Magma Basin BRS';
  public text: string =
    "Once during each player's turn, that player may attach a [R] Energy card from their discard pile to 1 of their Benched [R] Pokémon. If a player attached Energy to a Pokémon in this way, put 2 damage counters on that Pokémon.";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const hasFirePokemonOnBench = player.bench.some((b) =>
        b.cards.some((c) => c instanceof PokemonCard && pokemonHasCardType(c, CardType.FIRE)),
      );

      if (!hasFirePokemonOnBench) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const blocked2: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (!pokemonHasCardType(card, CardType.FIRE)) {
          blocked2.push(target);
        }
      });

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return c.superType === SuperType.ENERGY && c.name == 'Fire Energy';
      });

      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_STADIUM);
      }

      state = store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
          { allowCancel: false, min: 1, max: 1, blockedTo: blocked2 },
        ),
        (transfers) => {
          transfers = transfers || [];

          if (transfers.length === 0) {
            return state;
          }

          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            if (IS_STADIUM_EFFECT_BLOCKED(store, state, player, target, this)) {
              MOVE_CARDS(store, state, player.discard, target, {
                cards: [transfer.card],
                sourceCard: this,
              });
              continue;
            }
            MOVE_CARDS(store, state, player.discard, target, {
              cards: [transfer.card],
              sourceCard: this,
            });
            target.damage += 20;
          }
        },
      );
      return state;
    }

    return state;
  }
}

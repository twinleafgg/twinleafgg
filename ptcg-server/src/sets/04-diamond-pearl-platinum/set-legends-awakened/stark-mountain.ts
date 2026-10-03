import { CardTarget, MoveEnergyPrompt, PlayerType, SlotType } from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { CardType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import {
  CheckPokemonTypeEffect,
  CheckProvidedEnergyEffect,
} from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { UseStadiumEffect } from '../../../game/store/effects/game-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { IS_STADIUM_EFFECT_BLOCKED } from '../../../game/store/prefabs/stadium-effect';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

const STARK_TYPES = [CardType.FIRE, CardType.FIGHTING];
const MOVABLE_ENERGY = [...STARK_TYPES, CardType.ANY];

export class StarkMountain extends TrainerCard {
  protected _trainerType = TrainerType.STADIUM;
  public set = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '135';
  public name = 'Stark Mountain';
  public fullName = 'Stark Mountain LA';
  public text =
    "Once during each player's turn, that player may choose a [R] or [F] Energy attached to 1 of his or her Pokémon and move that Energy to 1 of his or her [R] or [F] Pokémon.";

  reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof UseStadiumEffect && StateUtils.getStadiumCard(state) === this) {
      const player = effect.player;
      const blockedMap: { source: CardTarget; blocked: number[] }[] = [];
      const blockedTo: CardTarget[] = [];

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, _card, target) => {
        const checkProvidedEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergy);

        const blocked = checkProvidedEnergy.energyMap
          .filter((em) => !MOVABLE_ENERGY.some((t) => em.provides.includes(t)))
          .map((em) => cardList.cards.indexOf(em.card))
          .filter((index) => index !== -1);

        if (blocked.length > 0) {
          blockedMap.push({ source: target, blocked: [...new Set(blocked)] });
        }

        const checkPokemonType = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, checkPokemonType);
        if (!STARK_TYPES.some((t) => checkPokemonType.cardTypes.includes(t))) {
          blockedTo.push(target);
        }
      });

      store.prompt(
        state,
        new MoveEnergyPrompt(
          player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { allowCancel: true, min: 1, max: 1, blockedMap, blockedTo },
        ),
        (transfers) => {
          if (!transfers?.length) {
            return;
          }

          for (const transfer of transfers) {
            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = StateUtils.getTarget(state, player, transfer.to);
            if (!source || !target) {
              continue;
            }
            if (
              IS_STADIUM_EFFECT_BLOCKED(store, state, player, source, this) ||
              IS_STADIUM_EFFECT_BLOCKED(store, state, player, target, this)
            ) {
              continue;
            }
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }
        },
      );
    }

    return state;
  }
}

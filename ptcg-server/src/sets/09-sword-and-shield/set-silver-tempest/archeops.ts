import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType, BoardEffect } from '../../../game/store/card/card-types';
import { PowerType, GameMessage, PlayerType, SlotType, AttachEnergyPrompt, StateUtils, State, StoreLike, GameError } from '../../../game';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {SHUFFLE_DECK, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Archeops extends PokemonCard {

  public stage: Stage = Stage.STAGE_2;

  public regulationMark = 'F';

  public evolvesFrom = 'Archen';

  public cardType: CardType[] = [CardType.COLORLESS];

  public hp: number = 150;

  public weakness = [{ type: CardType.LIGHTNING }];

  public resistance = [{ type: CardType.FIGHTING, value: -30 }];

  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'Primal Turbo',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may search your deck for up ' +
      'to 2 Special Energy cards and attach them to 1 of your ' +
      'Pokémon. Then, shuffle your deck.'
  }];

  public attacks = [
    {
      name: 'Speed Wing',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 120,
      text: ''
    }];

  public set: string = 'SIT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '147';

  public name: string = 'Archeops';

  public fullName: string = 'Archeops SIT';

  public readonly PRIMAL_TURBO_MARKER = 'PRIMAL_TURBO_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.PRIMAL_TURBO_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.marker.hasMarker(this.PRIMAL_TURBO_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      state = store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.deck,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH, SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.SPECIAL },
        { allowCancel: false, min: 0, max: 2, sameTarget: true }
      ), transfers => {
        transfers = transfers || [];
        // cancelled by user
        if (transfers.length === 0) {
          SHUFFLE_DECK(store, state, player);
          return;
        }
        player.marker.addMarker(this.PRIMAL_TURBO_MARKER, this);

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
          }
        });

        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
        }
        SHUFFLE_DECK(store, state, player);
      });

      return state;
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.PRIMAL_TURBO_MARKER, this);
    }

    return state;
  }
}

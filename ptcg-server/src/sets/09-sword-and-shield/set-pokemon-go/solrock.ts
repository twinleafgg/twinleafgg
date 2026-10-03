import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType, BoardEffect } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage, AttachEnergyPrompt, EnergyCard, GameError, PlayerType, SlotType, StateUtils, PowerType, CardTarget } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Solrock extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 90;
  public weakness = [{ type: G }];
  public retreat = [C];

  public powers = [{
    name: 'Sun Energy',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn, you may attach a [P] Energy card from your discard pile to 1 of your Lunatone.'
  }];

  public attacks = [
    {
      name: 'Spinning Attack',
      cost: [F, C],
      damage: 50,
      text: ''
    }];

  public regulationMark = 'F';
  public set: string = 'PGO';
  public setNumber: string = '39';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Solrock';
  public fullName: string = 'Solrock PGO';

  public readonly SUN_ENERGY_MARKER = 'SUN_ENERGY_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.marker.removeMarker(this.SUN_ENERGY_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      // Check if player has a Lunatone in play
      let hasLunatone = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const pokemon = cardList.getPokemonCard();
        if (pokemon && pokemon.name === 'Lunatone') {
          hasLunatone = true;
        }
      });

      if (!hasLunatone) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const hasPsychicEnergyInDiscard = player.discard.cards.some(c => {
        return c instanceof EnergyCard
          && c.energyType === EnergyType.BASIC
          && c.provides.includes(CardType.PSYCHIC);
      });

      if (!hasPsychicEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blocked2: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (card.name !== 'Lunatone') {
          blocked2.push(target);
        }
      });

      if (player.marker.hasMarker(this.SUN_ENERGY_MARKER, this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      state = store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_ACTIVE,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH, SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Psychic Energy' },
        { allowCancel: false, min: 1, max: 1, blockedTo: blocked2 }
      ), transfers => {
        transfers = transfers || [];
        player.marker.addMarker(this.SUN_ENERGY_MARKER, this);

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
          }
        });

        if (transfers.length === 0) {
          return;
        }

        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          const targetPokemon = target.getPokemonCard();
          if (targetPokemon && targetPokemon.name === 'Lunatone') {
            MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
          }
        }
        return state;
      });
    }

    return state;
  }
}

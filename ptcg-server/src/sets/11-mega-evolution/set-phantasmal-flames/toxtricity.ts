import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { PowerType, GameMessage, PlayerType, SlotType, AttachEnergyPrompt, StateUtils, State, StoreLike, GameError, CardTarget, pokemonHasCardType } from '../../../game';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {ABILITY_USED, SHUFFLE_DECK, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Toxtricity extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Toxel';
  public cardType: CardType[] = [D];
  public hp: number = 130;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public powers = [{
    name: 'Sinister Surge',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may search your deck for a Basic [D] Energy card and attach it to 1 of your [D] Pokémon. Then, shuffle your deck. If you attached Energy to a Pokémon in this way, put 2 damage counters on that Pokémon.'
  }];

  public attacks = [{
    name: 'Thwap',
    cost: [D, D, C],
    damage: 100,
    text: ''
  }];

  public regulationMark = 'I';
  public set: string = 'PFL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '68';
  public name: string = 'Toxtricity';
  public fullName: string = 'Toxtricity M2';

  public readonly BAD_BOOST_MARKER = 'BAD_BOOST_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.BAD_BOOST_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.marker.hasMarker(this.BAD_BOOST_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      const blocked2: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (!pokemonHasCardType(card, CardType.DARK)) {
          blocked2.push(target);
        }
      });

      state = store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.deck,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH, SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Darkness Energy' },
        { allowCancel: true, min: 0, max: 1, blockedTo: blocked2 }
      ), transfers => {
        transfers = transfers || [];
        ABILITY_USED(player, this);
        player.marker.addMarker(this.BAD_BOOST_MARKER, this);

        // cancelled by user
        if (transfers.length === 0) {
          SHUFFLE_DECK(store, state, player);
          return;
        }

        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
          SHUFFLE_DECK(store, state, player);
          target.damage += 20;
        }
      });
      return state;
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.BAD_BOOST_MARKER, this)) {
      effect.player.marker.removeMarker(this.BAD_BOOST_MARKER, this);
    }

    return state;
  }
}

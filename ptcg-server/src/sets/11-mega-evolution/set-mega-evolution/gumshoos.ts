import { ChooseCardsPrompt, GameError, GameMessage, PowerType, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {ABILITY_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Gumshoos extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Yungoos';
  public cardType: CardType[] = [C];
  public hp: number = 100;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: 'Gather Evidence',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may use this Ability. Switch a card from your hand with the top card of your deck.'
  }];

  public attacks = [{
    name: 'Bite',
    cost: [C, C],
    damage: 50,
    text: ''
  }];

  public set: string = 'MEG';
  public setNumber: string = '110';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Gumshoos';
  public fullName: string = 'Gumshoos M1L';
  public regulationMark = 'I';

  public readonly GATHER_EVIDENCE_MARKER = 'GATHER_EVIDENCE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.GATHER_EVIDENCE_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0 || player.hand.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.GATHER_EVIDENCE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DECK,
        player.hand,
        {},
        { min: 1, max: 1, allowCancel: true }
      ), selected => {
        const cards = selected || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });
          const index = player.hand.cards.indexOf(cards[0]);
          if (index !== -1) {
            player.hand.cards.splice(index, 1);
            player.deck.cards.unshift(cards[0]);
          }
          player.marker.addMarker(this.GATHER_EVIDENCE_MARKER, this);
          ABILITY_USED(player, this);
        }
      });
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.GATHER_EVIDENCE_MARKER, this);
    }

    return state;
  }

}

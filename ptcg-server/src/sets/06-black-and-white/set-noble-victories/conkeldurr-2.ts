import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, TrainerType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, TrainerCard, ChooseCardsPrompt, GameMessage, GameError } from '../../../game';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, WAS_POWER_USED, IS_ABILITY_BLOCKED, SHOW_CARDS_TO_PLAYER, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { StateUtils } from '../../../game/store/state-utils';
import { PlayPokemonEffect, CoinFlipSequenceEffect } from '../../../game/store/effects/play-card-effects';

export class Conkeldurr2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Gurdurr';
  public cardType: CardType[] = [F];
  public hp: number = 140;
  public weakness = [{ type: P }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Top Down',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may search your discard pile for a Stadium card, show it to your opponent, and put it on top of your deck.'
  }];

  public attacks = [{
    name: 'Chip Away',
    cost: [F, C, C, C],
    damage: 80,
    text: 'Flip a coin until you get tails. For each heads, discard the top card of your opponent\'s deck.'
  }];

  public set: string = 'NVI';
  public setNumber: string = '64';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Conkeldurr';
  public fullName: string = 'Conkeldurr NVI 64';

  public readonly TOP_DOWN_MARKER = 'TOP_DOWN_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Reset marker when Pokémon is played
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      effect.player.marker.removeMarker(this.TOP_DOWN_MARKER, this);
    }

    // Top Down ability
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.TOP_DOWN_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      // Check for Stadium cards in discard
      const stadiumCards = player.discard.cards.filter(c =>
        c instanceof TrainerCard && c.trainerType === TrainerType.STADIUM
      );

      if (stadiumCards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      player.marker.addMarker(this.TOP_DOWN_MARKER, this);

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DECK,
        player.discard,
        { superType: SuperType.TRAINER, trainerType: TrainerType.STADIUM },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        if (selected && selected.length > 0) {
          const opponent = StateUtils.getOpponent(state, player);
          SHOW_CARDS_TO_PLAYER(store, state, opponent, selected);

          // Put on top of deck
          MOVE_CARDS(store, state, player.discard, player.deck, { cards: [selected[0]], sourceCard: this });
        }
      });
    }

    // Clear marker at end of turn
    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.TOP_DOWN_MARKER, this);
    }

    // Chip Away attack - flip until tails, discard cards from opponent's deck for each heads
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const sequenceEffect = new CoinFlipSequenceEffect(player, 'untilTails', (results: boolean[]) => {
        for (const isHeads of results) {
          if (isHeads && opponent.deck.cards.length > 0) {
            MOVE_CARDS(store, state, opponent.deck, opponent.discard, { count: 1, sourceCard: this });
          }
        }
      });
      return store.reduceEffect(state, sequenceEffect);
    }

    return state;
  }
}

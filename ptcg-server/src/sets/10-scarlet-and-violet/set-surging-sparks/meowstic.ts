import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, GameMessage, PlayerType, SlotType, ChoosePokemonPrompt, GameError, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { StateUtils } from '../../../game/store/state-utils';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Meowstic extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Espurr';

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 90;

  public weakness = [{ type: CardType.DARK }];

  public resistance = [{ type: CardType.FIGHTING, value: -30 }];

  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'Beckoning Tail',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'You must discard a Chill Teaser Toy card from your hand in order to use this Ability. Once during your turn, you may switch in 1 of your opponent\'s Benched Pokemon to the Active Spot.'
  }];

  public attacks = [
    {
      name: 'Psyshot',
      cost: [CardType.PSYCHIC, CardType.COLORLESS, CardType.COLORLESS],
      damage: 80,
      text: ''
    }
  ];

  public set: string = 'SSP';

  public setNumber = '85';

  public cardImage = 'assets/cardback.png';

  public regulationMark: string = 'H';

  public name: string = 'Meowstic';

  public fullName: string = 'Meowstic SSP';

  public readonly BECKONING_TAIL_MARKER = 'BECKONING_TAIL_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.BECKONING_TAIL_MARKER, this);
    }

    // Beckoning Tail
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasBench = opponent.bench.some(b => b.cards.length > 0);
      if (!hasBench) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.hand.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      let chillToyInHand = false;
      player.hand.cards.forEach(c => {
        if (c.name === 'Chill Teaser Toy') {
          chillToyInHand = true;
        }
      });
      if (!chillToyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.BECKONING_TAIL_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { name: 'Chill Teaser Toy', superType: SuperType.TRAINER },
        { allowCancel: false, min: 1, max: 1 }
      ), cards => {
        MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
        return store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_SWITCH,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { allowCancel: false }
        ), result => {
          const cardList = result[0];
          opponent.switchPokemon(cardList);
        });
      });
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.BECKONING_TAIL_MARKER, this);
    }

    return state;
  }
}
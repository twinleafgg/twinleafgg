import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, GameError, GameMessage, ChooseCardsPrompt, CardList } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Charizard extends PokemonCard {

  public stage: Stage = Stage.STAGE_2;

  public evolvesFrom = 'Charmeleon';

  public cardType: CardType[] = [CardType.FIRE];

  public hp: number = 170;

  public weakness = [{ type: CardType.WATER }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Battle Sense',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn, you may look at the top 3 cards of your ' +
      'deck and put 1 of them into your hand. Discard the other cards.'
  }];

  public attacks = [
    {
      name: 'Royal Blaze',
      cost: [CardType.FIRE, CardType.FIRE],
      damage: 100,
      text: 'This attack does 50 more damage for each Leon card ' +
        'in your discard pile.'
    }
  ];

  public set: string = 'VIV';

  public name: string = 'Charizard';

  public fullName: string = 'Charizard VIV';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '25';

  public readonly BATTLE_SENSE_MARKER = 'BATTLE_SENSE';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.BATTLE_SENSE_MARKER, this);
      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const cards = effect.player.discard.cards.filter(c => c.name === 'Leon');
      effect.damage += cards.length * 50;
      return state;
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.BATTLE_SENSE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      const deckTop = new CardList();
      MOVE_CARDS(store, state, player.deck, deckTop, { count: 3, sourceCard: this });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        deckTop,
        {},
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        player.marker.addMarker(this.BATTLE_SENSE_MARKER, this);
        MOVE_CARDS(store, state, deckTop, player.hand, { cards: selected, sourceCard: this });
        MOVE_CARDS(store, state, deckTop, player.discard, { sourceCard: this });
      });
    }

    if (effect instanceof EndTurnEffect && effect.player.marker.hasMarker(this.BATTLE_SENSE_MARKER, this)) {
      effect.player.marker.removeMarker(this.BATTLE_SENSE_MARKER, this);
    }

    return state;
  }

}

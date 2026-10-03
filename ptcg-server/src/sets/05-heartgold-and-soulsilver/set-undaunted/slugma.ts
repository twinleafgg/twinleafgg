import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { StoreLike, State, GameMessage, CardList, EnergyCard, ShowCardsPrompt, GameError, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {ABILITY_USED, ADD_MARKER, REMOVE_MARKER, REMOVE_MARKER_AT_END_OF_TURN, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Slugma extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public evolvesFrom = 'Slugma';
  public cardType: CardType[] = [R];
  public hp = 60;
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public powers = [{
    name: 'Active Volcano',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may discard the top card of your deck. If that card is a [R] Energy card, attach it to Slugma. This power can\'t be used if Slugma is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Combustion',
    cost: [R, R, C],
    damage: 40,
    text: ''
  }];

  public set: string = 'UD';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '67';
  public name: string = 'Slugma';
  public fullName: string = 'Slugma UD';

  public readonly ACTIVE_VOLCANO_MARKER = 'ACTIVE_VOLCANO_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      REMOVE_MARKER(this.ACTIVE_VOLCANO_MARKER, this);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ACTIVE_VOLCANO_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {

      const player = effect.player;
      const temp = new CardList();

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (player.marker.hasMarker(this.ACTIVE_VOLCANO_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      MOVE_CARDS(store, state, player.deck, temp, { count: 1, sourceCard: this });

      // Check if any cards drawn are basic energy
      const energyCardsDrawn = temp.cards.filter(card => {
        return card instanceof EnergyCard && card.energyType === EnergyType.BASIC && card.name === 'Fire Energy';
      });

      // If no energy cards were drawn, move all cards to discard
      if (energyCardsDrawn.length == 0) {

        ADD_MARKER(this.ACTIVE_VOLCANO_MARKER, player, this);
        ABILITY_USED(player, this);

        temp.cards.slice(0, 1).forEach(card => {

          store.prompt(state, [new ShowCardsPrompt(
            player.id,
            GameMessage.CARDS_SHOWED_BY_EFFECT,
            temp.cards
          )], () => {
            MOVE_CARDS(store, state, temp, player.discard, { sourceCard: this });
          });
        });

      } else {

        // Automatically attach energy to this Pokemon (Slugma)
        ADD_MARKER(this.ACTIVE_VOLCANO_MARKER, player, this);
        ABILITY_USED(player, this);

        const cardList = StateUtils.findCardList(state, this);

        store.prompt(state, [new ShowCardsPrompt(
          player.id,
          GameMessage.CARDS_SHOWED_BY_EFFECT,
          temp.cards
        )], () => {
          energyCardsDrawn.forEach(card => {
            MOVE_CARDS(store, state, temp, cardList, { cards: [card], sourceCard: this });
          });
        });
      }
    }
    return state;
  }
}

import { PokemonCard, Stage, CardType, PowerType, StoreLike, State, ChooseCardsPrompt, GameMessage, ShuffleDeckPrompt, ShowCardsPrompt, StateUtils, EnergyType, SuperType, GameError } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, ABILITY_USED, REMOVE_MARKER_AT_END_OF_TURN, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Aromatisse extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Spritzee';
  public cardType: CardType[] = [P];
  public hp: number = 120;
  public weakness = [{ type: M }];
  public retreat = [C];

  public powers = [{
    name: 'Scent Collection',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn, you may use this Ability. Search your deck for up to 2 Basic [P] Energy cards, reveal them, and put them into your hand. Then, shuffle your deck. '
  }];

  public attacks = [{
    name: 'Draining Kiss',
    cost: [P, C],
    damage: 50,
    text: 'Heal 30 damage from this Pokémon.'
  }];

  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '36';
  public name: string = 'Aromatisse';
  public fullName: string = 'Aromatisse M3';

  public readonly FRAGRANCE_COLLECTION_MARKER = 'FRAGRANCE_COLLECTION_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fragrance Collection ability
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.marker.hasMarker(this.FRAGRANCE_COLLECTION_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      ABILITY_USED(player, this);
      player.marker.addMarkerToState(this.FRAGRANCE_COLLECTION_MARKER);

      // Filter deck for Basic Psychic Energy
      const basicPsychicEnergy = player.deck.cards.filter(card =>
        card.superType === SuperType.ENERGY &&
        card.energyType === EnergyType.BASIC &&
        (card as import('../../../game/store/card/energy-card').EnergyCard).provides.includes(CardType.PSYCHIC)
      );

      if (basicPsychicEnergy.length === 0) {
        return state;
      }

      const maxToTake = Math.min(2, basicPsychicEnergy.length);
      let selectedCards: any[] = [];

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Psychic Energy' },
        { min: 0, max: maxToTake, allowCancel: false }
      ), selected => {
        selectedCards = selected || [];
        MOVE_CARDS(store, state, player.deck, player.hand, { cards: selectedCards, sourceCard: this });

        // Show cards to opponent
        if (selectedCards.length > 0) {
          const opponent = StateUtils.getOpponent(state, player);
          store.prompt(state, new ShowCardsPrompt(
            opponent.id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            selectedCards
          ), () => state);
        }

        return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
          player.deck.applyOrder(order);
        });
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.FRAGRANCE_COLLECTION_MARKER, this);

    // Drain Kiss - heal 30 from this Pokemon
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const healEffect = new HealEffect(player, player.active, 30);
      store.reduceEffect(state, healEffect);
    }

    return state;
  }
}

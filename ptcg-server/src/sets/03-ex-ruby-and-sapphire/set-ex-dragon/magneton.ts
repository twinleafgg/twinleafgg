import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  GameError,
  GameMessage,
  ChooseCardsPrompt,
  StateUtils,
  ShowCardsPrompt,
  PlayerType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { ABILITY_USED, ADD_MARKER, HAS_MARKER, MOVE_CARDS, REMOVE_MARKER, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';

export class Magneton extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Magnemite';
  public cardType: CardType[] = [L];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -30 }];
  public retreat = [C];

  public powers = [{
    name: 'Magnetic Field',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), if you have basic Energy cards in your discard pile, you may discard any 1 card from your hand. Then search for up to 2 basic Energy cards from your discard pile, show them to your opponent, and put them into your hand. You can\'t return the card you first discarded to your hand in this way. This power can\'t be used if Magneton is affected by a Special Condition.'
  }];

  public attacks = [
    {
      name: 'Magnetic Force',
      cost: [L, C],
      damage: 10,
      damageCalculation: 'x',
      text: 'Does 10 damage times the amount of Energy attached to all of your Pokémon (including Magneton).'
    }
  ];

  public set: string = 'DR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '17';
  public name: string = 'Magneton';
  public fullName: string = 'Magneton DR';

  public readonly MAGNETIC_FIELD_MARKER = 'MAGNETIC_FIELD_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Magnetic Field
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const energyInDiscard = player.discard.cards.filter(c => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC).length;

      // Must have energy in discard
      if (energyInDiscard === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      // Need cards in hand
      if (player.hand.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      // Need cards in hand
      if (player.hand.cards.length === 0) {
        return state;
      }
      // One per turn only
      if (HAS_MARKER(this.MAGNETIC_FIELD_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      // Cannot use if affected by special conditions
      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        {},
        { allowCancel: true, min: 1, max: 1 }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }
        const cardToDiscard = cards[0];
        const max = Math.min(energyInDiscard, 2);

        state = store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 0, max: max, allowCancel: false }
        ), selected => {
          const cards = selected || [];

          store.prompt(state, [new ShowCardsPrompt(
            opponent.id,
            GameMessage.CARDS_SHOWED_BY_THE_OPPONENT,
            cards
          )], () => {
            MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this, sourceEffect: this.powers[0] });
          });

          // Move the discarded card to the discard pile after energy cards are added to the hand
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: [cardToDiscard], sourceCard: this, sourceEffect: this.powers[0] });
        });

        ADD_MARKER(this.MAGNETIC_FIELD_MARKER, player, this);
        ABILITY_USED(player, this);

        return state;
      });

      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      let energyCount = 0;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkProvidedEnergyEffect);

        checkProvidedEnergyEffect.energyMap.forEach(em => {
          energyCount += em.provides.length;
        });
      });

      effect.damage = energyCount * 10;
      return state;
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.MAGNETIC_FIELD_MARKER, this);

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      REMOVE_MARKER(this.MAGNETIC_FIELD_MARKER, player, this);
    }

    return state;
  }
}

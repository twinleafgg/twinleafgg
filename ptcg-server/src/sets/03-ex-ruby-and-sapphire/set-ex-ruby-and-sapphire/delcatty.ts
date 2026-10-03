import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import {ABILITY_USED, ADD_MARKER, HAS_MARKER, REMOVE_MARKER, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PowerType, StoreLike, State, GameError, ChooseCardsPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';

export class Delcatty extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Skitty';
  public cardType: CardType[] = [C];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: 'Energy Draw',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may discard 1 Energy card from your hand. Then draw up to 3 cards from your deck. This power can\'t be used if Delcatty is affected by a Special Condition.'
  }];

  public attacks = [
    {
      name: 'Max Energy Source',
      cost: [C],
      damage: 10,
      damageCalculation: 'x',
      text: 'Does 10 damage times the amount of Energy attached to all of your Active Pokémon.'
    }
  ];

  public set: string = 'RS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '5';
  public name: string = 'Delcatty';
  public fullName: string = 'Delcatty RS';

  public readonly ENERGY_DRAW_MARKER = 'ENERGY_DRAW_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    // Energy Draw
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEnergyInHand = player.hand.cards.some(c => {
        return c instanceof EnergyCard;
      });

      // One per turn only
      if (HAS_MARKER(this.ENERGY_DRAW_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      // Cannot use if affected by special conditions
      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      // Cannot use if there is no energy in hand
      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY },
        { allowCancel: true, min: 1, max: 1 }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }

        MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
        MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });
      });

      ADD_MARKER(this.ENERGY_DRAW_MARKER, player, this);
      ABILITY_USED(player, this);

      return state;
    }

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      REMOVE_MARKER(this.ENERGY_DRAW_MARKER, player, this);
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const cardList = player.active;

      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player, cardList);
      store.reduceEffect(state, checkProvidedEnergyEffect);

      let energies: number = 0;
      checkProvidedEnergyEffect.energyMap.forEach(energy => { energy.provides.forEach(e => { energies++; }); });
      effect.damage = 10 * energies;
    }

    //Marker remover
    if (effect instanceof EndTurnEffect) {
      if (HAS_MARKER(this.ENERGY_DRAW_MARKER, effect.player, this)) {
        REMOVE_MARKER(this.ENERGY_DRAW_MARKER, effect.player, this);
      }
    }

    return state;
  }
}


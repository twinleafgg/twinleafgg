import { ChooseCardsPrompt, ChoosePokemonPrompt, EnergyCard, GameError, GameMessage, PlayerType, SlotType, StateUtils } from '../../../game';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';

import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { State } from '../../../game/store/state/state';
import { StoreLike } from '../../../game/store/store-like';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Pyroar extends PokemonCard {

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Litleo';

  public cardType: CardType[] = [CardType.FIRE];

  public hp: number = 110;

  public weakness = [{ type: CardType.WATER }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Flare Command',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may discard a [R] Energy attached to this Pokémon. If you do, switch 1 of your opponent\'s Benched Pokémon with his or her Active Pokémon.'
  }];

  public attacks = [{
    name: 'Inferno Onrush',
    cost: [CardType.FIRE, CardType.FIRE, CardType.FIRE, CardType.COLORLESS],
    damage: 110,
    text: 'This Pokémon does 30 damage to itself.'
  }];

  public set: string = 'PHF';

  public name: string = 'Pyroar';

  public fullName: string = 'Pyroar PHF';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '12';

  public readonly FLARE_COMMAND_MARKER = 'FLARE_COMMAND_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const dealDamage = new DealDamageEffect(effect, 30);
      dealDamage.target = player.active;
      return store.reduceEffect(state, dealDamage);
    }

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.FLARE_COMMAND_MARKER, this);
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.marker.removeMarker(this.FLARE_COMMAND_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);

      if (player.marker.hasMarker(this.FLARE_COMMAND_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      const hasEnergyAttached = cardList.cards.some(c => {
        return c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.name === 'Fire Energy';
      });

      if (!hasEnergyAttached) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.active,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        selected || [];
        if (selected.length === 0) {
          return;
        }
        MOVE_CARDS(store, state, player.active, player.discard, { cards: selected, sourceCard: this });
        player.marker.addMarker(this.FLARE_COMMAND_MARKER, this);

        const opponent = StateUtils.getOpponent(state, player);
        const hasBench = opponent.bench.some(b => b.cards.length > 0);

        if (!hasBench) {
          return state;
        }

        return store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_SWITCH,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { allowCancel: false }
        ), result => {
          const cardList = result[0];

          opponent.switchPokemon(cardList);
          return state;
        });
      });
    }

    return state;
  }

}

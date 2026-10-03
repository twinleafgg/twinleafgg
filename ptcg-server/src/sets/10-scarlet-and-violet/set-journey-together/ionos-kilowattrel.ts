import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  EnergyType,
} from '../../../game/store/card/card-types';
import {
  ChooseCardsPrompt,
  EnergyCard,
  GameError,
  GameMessage,
  PokemonCardList,
  PowerType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';

import {ABILITY_USED,
  ADD_MARKER,
  DRAW_CARDS_UNTIL_CARDS_IN_HAND,
  WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class IonosKilowattrel extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = "Iono's Wattrel";
  protected _tags = [CardTag.IONOS];
  public cardType: CardType[] = [L];
  public hp: number = 120;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public powers = [
    {
      name: 'Flashing Draw',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'You must discard a Basic [L] Energy from this Pokémon in order to use this Ability. Once during your turn, you may draw cards until you have 6 cards in your hand.',
    },
  ];

  public attacks = [
    {
      name: 'Mach Bolt',
      cost: [L, C, C],
      damage: 70,
      text: '',
    },
  ];

  public regulationMark = 'I';
  public set: string = 'JTG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '55';
  public name: string = "Iono's Kilowattrel";
  public fullName: string = "Iono's Kilowattrel JTG";

  public readonly RUMBLING_ENGINE_MARKER = 'RUMBLING_ENGINE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.RUMBLING_ENGINE_MARKER, this);
    }

    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.marker.removeMarker(this.RUMBLING_ENGINE_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.hand.cards.length >= 6) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.RUMBLING_ENGINE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;
      const lightningEnergy = cardList.cards.filter(
        (c) =>
          c instanceof EnergyCard &&
          c.superType === SuperType.ENERGY &&
          c.energyType === EnergyType.BASIC &&
          c.name === 'Lightning Energy',
      );

      if (lightningEnergy.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // If we have exactly 1 basic [L] energy attached, do it without a prompt
      if (lightningEnergy.length === 1) {
        lightningEnergy.forEach((card) => MOVE_CARDS(store, state, cardList, player.discard, { cards: [card], sourceCard: this }));

        DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, 6);
        ADD_MARKER(this.RUMBLING_ENGINE_MARKER, player, this);
        ABILITY_USED(player, this);

        return state;
      }

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          cardList,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
          { allowCancel: true, min: 0, max: 1 },
        ),
        (energy) => {
          if (energy === null || energy.length === 0) {
            return state;
          }

          energy.forEach((card) => MOVE_CARDS(store, state, cardList, player.discard, { cards: [card], sourceCard: this }));

          DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, 6);
          ADD_MARKER(this.RUMBLING_ENGINE_MARKER, player, this);
          ABILITY_USED(player, this);
        },
      );
    }

    return state;
  }
}

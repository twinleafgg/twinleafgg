import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  EnergyType,
  SuperType,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  ChooseCardsPrompt,
  EnergyCard,
  GameError,
  GameMessage,
  PowerType,
  StateUtils,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

// LOT Naganadel 108 (https://limitlesstcg.com/cards/LOT/108)
export class Naganadel extends PokemonCard {
  protected _tags = [CardTag.ULTRA_BEAST];

  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = 'Poipole';

  public cardType: CardType[] = [CardType.PSYCHIC];

  public hp: number = 130;

  public weakness = [{ type: CardType.PSYCHIC }];

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Charging Up',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn (before your attack), you may attach a basic Energy card from your discard pile to this Pokémon. ',
    },
  ];

  public attacks = [
    {
      name: 'Turning Point',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 80,
      text: 'If you have exactly 3 Prize cards remaining, this attack does 80 more damage.',
    },
  ];

  public set: string = 'LOT';

  public name: string = 'Naganadel';

  public fullName: string = 'Naganadel LOT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '108';

  public readonly CHARGE_MARKER = 'CHARGE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.marker.hasMarker(this.CHARGE_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      // checking if there's energy in the discard
      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return c instanceof EnergyCard && c.energyType === EnergyType.BASIC;
      });
      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const cardList = StateUtils.findCardList(state, this);
      if (cardList === undefined) {
        return state;
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_ATTACH,
          player.discard,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
          { min: 1, max: 1, allowCancel: false },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length > 0) {
            player.marker.addMarker(this.CHARGE_MARKER, this);
            MOVE_CARDS(store, state, player.discard, cardList, { cards: cards, sourceCard: this });
          }
        },
      );
    }

    // Turning Point
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const prizesLeft = player.getPrizeLeft();

      if (prizesLeft === 3) {
        effect.damage += 80;
      }
    }

    if (effect instanceof EndTurnEffect) {
      effect.player.marker.removeMarker(this.CHARGE_MARKER, this);
    }
    return state;
  }
}

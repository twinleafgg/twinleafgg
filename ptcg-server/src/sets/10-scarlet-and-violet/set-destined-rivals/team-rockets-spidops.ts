import {
  PokemonCard,
  Stage,
  CardType,
  CardTag,
  StoreLike,
  State,
  GameError,
  GameMessage,
  EnergyType,
  PlayerType,
  SuperType,
  PowerType,
  StateUtils,
  ChooseCardsPrompt,
} from '../../../game';
import { EnergyCard } from '../../../game/store/card/energy-card';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TeamRocketsSpidops extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;

  public evolvesFrom = "Team Rocket's Tarountula";

  public cardType: CardType[] = [CardType.GRASS];

  public hp: number = 130;

  public weakness = [{ type: CardType.FIRE }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Charge Up',
      powerType: PowerType.ABILITY,
      useWhenInPlay: true,
      text: 'Once during your turn, you may attach 1 Basic Energy from your discard pile to this Pokémon.',
    },
  ];

  public attacks = [
    {
      name: 'Rocket Rush',
      cost: [CardType.GRASS, CardType.COLORLESS],
      damage: 30,
      damageCalculation: 'x',
      text: "This attack does 30 damage for each of your Team Rocket's Pokemon in play.",
    },
  ];

  protected _tags = [CardTag.TEAM_ROCKET];

  public set: string = 'DRI';

  public regulationMark = 'I';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '20';

  public name: string = "Team Rocket's Spidops";

  public fullName: string = "Team Rocket's Spidops DRI";

  public readonly CHARGE_UP_MARKER = 'CHARGE_UP_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EndTurnEffect) {
      const player = effect.player;
      player.marker.removeMarker(this.CHARGE_UP_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      const hasEnergyInDiscard = player.discard.cards.some((c) => {
        return c instanceof EnergyCard && c.energyType === EnergyType.BASIC;
      });

      if (!hasEnergyInDiscard) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.marker.hasMarker(this.CHARGE_UP_MARKER, this)) {
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
            player.marker.addMarker(this.CHARGE_UP_MARKER, this);
            MOVE_CARDS(store, state, player.discard, cardList, { cards: cards, sourceCard: this });
          }
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      // Count Team Rocket's Pokemon in play
      const player = effect.player;
      let teamRocketCount = 0;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card) => {
        if (card.hasTag(CardTag.TEAM_ROCKET)) {
          teamRocketCount++;
        }
      });

      // Modify damage based on count
      effect.damage = 30 * teamRocketCount;
    }

    return state;
  }
}

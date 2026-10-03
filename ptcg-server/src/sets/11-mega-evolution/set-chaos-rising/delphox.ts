import { PokemonCard, Stage, CardType, PowerType, StoreLike, State, GameError, GameMessage, EnergyCard, EnergyType, ChooseCardsPrompt, SuperType, StateUtils, PlayerType } from "../../../game";
import { CheckProvidedEnergyEffect } from "../../../game/store/effects/check-effects";
import { Effect } from "../../../game/store/effects/effect";
import { PlayPokemonEffect } from "../../../game/store/effects/play-card-effects";
import { REMOVE_MARKER_AT_END_OF_TURN, WAS_POWER_USED, MOVE_CARDS, DRAW_CARDS_UNTIL_CARDS_IN_HAND, ABILITY_USED, WAS_ATTACK_USED } from "../../../game/store/prefabs/prefabs";

export class Delphox extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Braixen';
  public hp: number = 160;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public powers = [{
    name: 'Flaring Magic',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn, you may discard a Basic [R] Energy card from your hand in order to use this Ability. Draw cards until you have 7 cards in your hand.',
  }];

  public attacks = [{
    name: 'Energized Storm',
    cost: [R, R],
    damage: 30,
    damageCalculation: 'x',
    text: 'This attack does 30 damage for each Energy attached to all Pokémon.',
  }];

  public regulationMark = 'J';
  public set: string = 'CRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '13';
  public name: string = 'Delphox';
  public fullName: string = 'Delphox M4';

  public readonly FLARING_MAGIC_MARKER = 'FLARING_MAGIC_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      effect.player.marker.removeMarker(this.FLARING_MAGIC_MARKER, this);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.FLARING_MAGIC_MARKER, this);

    // Flaring Magic
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.marker.hasMarker(this.FLARING_MAGIC_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (player.hand.cards.length >= 7) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const hasBasicFireInHand = player.hand.cards.some(
        (c) =>
          c instanceof EnergyCard &&
          c.energyType === EnergyType.BASIC &&
          c.provides.includes(CardType.FIRE),
      );
      if (!hasBasicFireInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
          { allowCancel: true, min: 1, max: 1 },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length === 0) {
            return;
          }

          MOVE_CARDS(store, state, player.hand, player.discard, {
            cards,
            sourceCard: this,
            sourceEffect: this.powers[0],
          });

          DRAW_CARDS_UNTIL_CARDS_IN_HAND(player, 7);
          player.marker.addMarker(this.FLARING_MAGIC_MARKER, this);
          ABILITY_USED(player, this);
        },
      );
    }

    // Energized Storm
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      let totalEnergy = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const checkEnergy = new CheckProvidedEnergyEffect(player, cardList);
        store.reduceEffect(state, checkEnergy);
        checkEnergy.energyMap.forEach((em) => {
          totalEnergy += em.provides.length;
        });
      });
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
        const checkEnergy = new CheckProvidedEnergyEffect(opponent, cardList);
        store.reduceEffect(state, checkEnergy);
        checkEnergy.energyMap.forEach((em) => {
          totalEnergy += em.provides.length;
        });
      });
      effect.damage = 30 * totalEnergy;
    }
    return state;
  }
}

import { PokemonCard, Stage, CardType, PowerType, StoreLike, State, GameError, GameMessage, PlayerType, EnergyCard, EnergyType, StateUtils, PokemonCardList, ChooseCardsPrompt, SuperType } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from "../../../game/store/prefabs/costs";
import {WAS_POWER_USED, IS_ABILITY_BLOCKED, USE_ABILITY_ONCE_PER_TURN, ABILITY_USED, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class Moltres extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 120;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C];

  public powers = [{
    name: 'Fiery Flapping',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn, if you have Articuno and Zapdos in play, you may use this Ability. Attach a Basic [R] Energy card from your hand to this Pokémon.'
  }];

  public attacks = [{
    name: 'Fire Spin',
    cost: [R, R, C],
    damage: 130,
    text: 'Discard 2 Energy from this Pokémon.'
  }];

  public regulationMark: string = 'J';
  public set: string = '30C';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '11';
  public name: string = 'Moltres';
  public fullName: string = 'Moltres 30C';

  public readonly FIERY_FLAPPING_MARKER = 'FIERY_FLAPPING_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Fiery Flapping
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      let hasArticuno = false;
      let hasZapdos = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (cardList.getPokemonCard() !== card) {
          return;
        }
        if (card.name === 'Articuno') {
          hasArticuno = true;
        }
        if (card.name === 'Zapdos') {
          hasZapdos = true;
        }
      });

      if (!hasArticuno || !hasZapdos) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const hasEnergyInHand = player.hand.cards.some(c =>
        c instanceof EnergyCard
        && c.energyType === EnergyType.BASIC
        && c.provides.includes(CardType.FIRE)
      );
      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.FIERY_FLAPPING_MARKER, this);
      ABILITY_USED(player, this);

      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        player.hand,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
        { min: 1, max: 1, allowCancel: false }
      ), cards => {
        if (cards && cards.length > 0) {
          MOVE_CARDS(store, state, player.hand, cardList, { cards: cards, sourceCard: this });
        }
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.FIERY_FLAPPING_MARKER, this);

    // Fire Spin
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 2);
    }

    return state;
  }
}

import { PokemonCard, Stage, CardType, PowerType, StoreLike, State, GameError, GameMessage, PlayerType, EnergyCard, EnergyType, StateUtils, PokemonCardList, ChooseCardsPrompt, SuperType } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import {WAS_POWER_USED, IS_ABILITY_BLOCKED, USE_ABILITY_ONCE_PER_TURN, ABILITY_USED, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class Zapdos extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 120;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: 'Flash-Pop Flapping',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn, if you have Moltres and Articuno in play, you may use this Ability. Attach a Basic [L] Energy card from your hand to this Pokémon.'
  }];

  public attacks = [{
    name: 'Thundering Lightning',
    cost: [L, L, L, C],
    damage: 210,
    text: 'This Pokémon also does 60 damage to itself.'
  }];

  public regulationMark: string = 'J';
  public set: string = '30C';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '55';
  public name: string = 'Zapdos';
  public fullName: string = 'Zapdos 30C';

  public readonly FLASH_POP_FLAPPING_MARKER = 'FLASH_POP_FLAPPING_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flash-Pop Flapping
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      let hasMoltres = false;
      let hasArticuno = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (cardList.getPokemonCard() !== card) {
          return;
        }
        if (card.name === 'Moltres') {
          hasMoltres = true;
        }
        if (card.name === 'Articuno') {
          hasArticuno = true;
        }
      });

      if (!hasMoltres || !hasArticuno) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const hasEnergyInHand = player.hand.cards.some(c =>
        c instanceof EnergyCard
        && c.energyType === EnergyType.BASIC
        && c.provides.includes(CardType.LIGHTNING)
      );
      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.FLASH_POP_FLAPPING_MARKER, this);
      ABILITY_USED(player, this);

      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        player.hand,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
        { min: 1, max: 1, allowCancel: false }
      ), cards => {
        if (cards && cards.length > 0) {
          MOVE_CARDS(store, state, player.hand, cardList, { cards: cards, sourceCard: this });
        }
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.FLASH_POP_FLAPPING_MARKER, this);

    // Thundering Lightning
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 60);
    }

    return state;
  }
}

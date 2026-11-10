import { PokemonCard, Stage, CardType, PowerType, StoreLike, State, GameError, GameMessage, PlayerType } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { WAS_POWER_USED, IS_ABILITY_BLOCKED, USE_ABILITY_ONCE_PER_TURN, ABILITY_USED, DRAW_CARDS, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED } from "../../../game/store/prefabs/prefabs";

export class Persian extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Meowth';
  public hp: number = 100;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [{
    name: 'Large Coin',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn, if you have 2 or more Pokémon in play with the "Pay Day" attack, you may draw 2 cards.'
  }];

  public attacks = [{
    name: 'Greedy Slash',
    cost: [C, C, C],
    damage: 20,
    damageCalculation: 'x',
    text: 'This attack does 20 damage for each card in your hand.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '70';
  public name: string = 'Persian';
  public fullName: string = 'Persian FLO';

  public readonly LARGE_COIN_MARKER = 'PERSIAN_LARGE_COIN_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Large Coin
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      let payDayCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const pokemonCard = cardList.getPokemonCard();
        if (pokemonCard && pokemonCard.attacks.some(a => a.name === 'Pay Day')) {
          payDayCount++;
        }
      });

      if (payDayCount < 2) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.LARGE_COIN_MARKER, this);
      ABILITY_USED(player, this);
      DRAW_CARDS(store, state, player, 2);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.LARGE_COIN_MARKER, this);

    // Greedy Slash
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.damage = 20 * effect.player.hand.cards.length;
    }

    return state;
  }
}

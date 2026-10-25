import { PokemonCard, CardType, Stage, ChoosePokemonPrompt, GameError, GameMessage, PlayerType, PowerType, SlotType, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE } from '../../game/store/prefabs/attack-effects';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, SHUFFLE_DECK, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../game/store/prefabs/prefabs';

export class Pidgeot extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Pidgeotto';
  public hp: number = 80;
  public cardType: CardType[] = [C];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [];

  public powers = [{
    // Beating Wings
    name: 'Beating Wings',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), if Pidgeot is your Active Pokémon, you may shuffle 1 of your Benched Pokémon and all cards attached to it into your deck. This power can\'t be used if Pidgeot is affected by a Special Condition.'
  }];

  public attacks = [{
    // Sharp Beak
    name: 'Sharp Beak',
    cost: [C, C, C],
    damage: 20,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 20 damage plus 30 more damage.'
  }];

  public set: string = 'P2';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '2';
  public name: string = 'Pidgeot';
  public fullName: string = 'Pidgeot P2';
  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Beating Wings
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      if (player.active.getPokemonCard() !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      if (!player.bench.some(b => b.cards.length > 0)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_SHUFFLE,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const target = selected[0];
        MOVE_CARDS(store, state, target, player.deck, { cards: [...target.cards], sourceCard: this });
        SHUFFLE_DECK(store, state, player);
      });
    }
    // Sharp Beak
    if (WAS_ATTACK_USED(effect, 0, this)) {
      FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 30);
    }
    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}

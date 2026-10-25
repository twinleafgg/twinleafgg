import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameError, GameMessage, PlayerType, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Honchkrow extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Murkrow';
  public hp: number = 90;
  public cardType: CardType[] = [D];
  public weakness = [{ type: L, value: +20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Darkness Restore',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), if Honchkrow is your Active Pokémon and your opponent\'s Bench isn\'t full, you may use this power. Search your opponent\'s discard pile for a Basic Pokémon and put it onto his or her bench. This power can\'t be used if Honchkrow is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Riot',
    cost: [D, C, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Does 30 damage plus 10 more damage for each Pokémon that isn\'t an evolved Pokémon in play (both yours and your opponent\'s).'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '29';
  public name: string = 'Honchkrow';
  public fullName: string = 'Honchkrow SV';

  public readonly DARKNESS_RESTORE_MARKER: string = 'DARKNESS_RESTORE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Darkness Restore
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const slots = opponent.bench.filter(b => b.cards.length === 0);

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      if (player.active.getPokemonCard() !== this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (slots.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (!opponent.discard.cards.some(card => card instanceof PokemonCard && card.stage === Stage.BASIC)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.DARKNESS_RESTORE_MARKER, this);
      ABILITY_USED(player, this);

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_BASIC_POKEMON_TO_BENCH,
        opponent.discard,
        { superType: SuperType.POKEMON, stage: Stage.BASIC },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        cards.forEach((card, index) => {
          MOVE_CARDS(store, state, opponent.discard, slots[index], { cards: [card], sourceCard: this, sourceEffect: this.powers[0] });
          slots[index].pokemonPlayedTurn = state.turn;
        });
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.DARKNESS_RESTORE_MARKER, this);

    // Riot
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      let unevolvedCount = 0;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList.getPokemons().length <= 1) {
          unevolvedCount++;
        }
      });
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        if (cardList.getPokemons().length <= 1) {
          unevolvedCount++;
        }
      });
      effect.damage += 10 * unevolvedCount;
    }

    return state;
  }
}

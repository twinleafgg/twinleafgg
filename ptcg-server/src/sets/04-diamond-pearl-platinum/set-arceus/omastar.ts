import { CardTarget, ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { DEVOLVE_POKEMON, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

const FOSSIL_NAMES = ['Helix Fossil', 'Dome Fossil', 'Old Amber'];

export class Omastar extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Omanyte';
  public hp: number = 120;
  public cardType: CardType[] = [W];
  public weakness = [{ type: G, value: +30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Time Spiral',
    cost: [C, C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Evolved Pokémon. Remove the highest Stage Evolution card from that Pokémon and have your opponent shuffle that card into his or her deck.'
  }, {
    name: 'Primal Tentacles',
    cost: [W, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Does 30 damage plus 10 more damage for each Helix Fossil, Dome Fossil, and Old Amber in your discard pile.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '23';
  public name: string = 'Omastar';
  public fullName: string = 'Omastar AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Time Spiral
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const blocked: CardTarget[] = [];
      let hasEvolved = false;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (list, card, target) => {
        if (list.getPokemons().length < 2) {
          blocked.push(target);
        } else {
          hasEvolved = true;
        }
      });
      if (!hasEvolved) {
        return state;
      }
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_EVOLVE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false, blocked }
      ), selected => {
        const target = selected[0];
        DEVOLVE_POKEMON(store, state, target, opponent.deck);
        SHUFFLE_DECK(store, state, opponent);
      });
    }

    // Primal Tentacles
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const fossils = effect.player.discard.cards.filter(c => FOSSIL_NAMES.includes(c.name)).length;
      effect.damage += 10 * fossils;
    }

    return state;
  }
}

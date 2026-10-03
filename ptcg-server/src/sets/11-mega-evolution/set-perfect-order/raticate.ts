import { PokemonCard, Stage, CardType, StoreLike, State, StateUtils, PlayerType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Raticate extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Rattata';
  public cardType: CardType[] = [C];
  public hp: number = 90;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Scrape Off',
    cost: [C],
    damage: 20,
    text: 'Before doing damage, discard all Pokémon Tools attached to your opponent\'s Active Pokémon.'
  },
  {
    name: 'Retaliatory Incisors',
    cost: [C],
    damage: 40,
    damageCalculation: 'x',
    text: 'This attack does 40 damage for each damage counter on all of your Benched Rattata.'
  }];

  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '61';
  public name: string = 'Raticate';
  public fullName: string = 'Raticate M3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Scrape Off - discard all Tools from opponent's Active
    // Ref: set-fusion-strike/sigilyph.ts (Joust)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.active.tools.length > 0) {
        MOVE_CARDS(store, state, opponent.active, opponent.discard, { cards: [...opponent.active.tools], sourceCard: this });
      }
    }

    // Countering Incisors - damage based on benched Rattata damage
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      let totalDamageCounters = 0;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        if (cardList !== player.active) {
          const pokemonCard = cardList.getPokemonCard();
          if (pokemonCard && pokemonCard.name === 'Rattata') {
            totalDamageCounters += Math.floor(cardList.damage / 10);
          }
        }
      });

      effect.damage = totalDamageCounters * 40;
    }

    return state;
  }
}

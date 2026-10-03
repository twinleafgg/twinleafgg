import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, PlayerType, ShuffleDeckPrompt } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {BLOCK_IF_GX_ATTACK_USED, WAS_ATTACK_USED, FLIP_UNTIL_TAILS_AND_COUNT_HEADS, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class TogepiCleffaIgglybuffGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX, CardTag.TAG_TEAM];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [Y];
  public hp: number = 240;
  public weakness = [{ type: M }];
  public resistance = [{ type: D, value: -20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Rolling Panic',
    cost: [Y, Y, C],
    damage: 120,
    damageCalculation: '+',
    text: 'Flip a coin until you get tails. This attack does 30 more damage for each heads.'
  }, {
    name: 'Supreme Puff-GX',
    cost: [Y, Y],
    damage: 0,
    gxAttack: true,
    text: 'Take another turn after this one. (Skip the between-turns step.) If this Pokémon has at least 14 extra [Y] Energy attached to it (in addition to this attack\'s cost), your opponent shuffles all of their Benched Pokémon and all cards attached to them into their deck. (You can\'t use more than 1 GX attack in a game.)'
  }];

  public set: string = 'CEC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '143';
  public name: string = 'Togepi & Cleffa & Igglybuff-GX';
  public fullName: string = 'Togepi & Cleffa & Igglybuff-GX CEC';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rolling Panic
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return FLIP_UNTIL_TAILS_AND_COUNT_HEADS(store, state, player, heads => {
        effect.damage += 30 * heads;
      });
    }

    // Supreme Puff-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;
      player.usedTurnSkip = true;

      // Check for the extra energy cost.
      const extraEffectCost: CardType[] = [Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y];
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergy);
      const meetsExtraEffectCost = StateUtils.checkEnoughEnergy(checkProvidedEnergy.energyMap, extraEffectCost);

      if (!meetsExtraEffectCost) { return state; }

      const opponent = StateUtils.getOpponent(state, player);

      opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (card !== opponent.active.getPokemonCard()) {
          MOVE_CARDS(store, state, cardList, opponent.deck, { sourceCard: this });
        }
      });
      store.prompt(state, new ShuffleDeckPrompt(opponent.id), order => {
        opponent.deck.applyOrder(order);
      });
    }

    return state;
  }
}

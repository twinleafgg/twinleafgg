import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { SuperType } from '../../../game';
import { CardTarget } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { MoveEnergyPrompt } from '../../../game';
import { PlayerType } from '../../../game';
import { PowerType } from '../../../game';
import { SlotType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED } from '../../../game/store/prefabs/prefabs';
import { BLOCK_IF_HAS_SPECIAL_CONDITION } from '../../../game/store/prefabs/prefabs';
import { IS_POKEPOWER_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { MULTIPLE_COIN_FLIPS_PROMPT } from '../../../game/store/prefabs/prefabs';
import { REMOVE_MARKER_AT_END_OF_TURN } from '../../../game/store/prefabs/prefabs';
import { USE_ABILITY_ONCE_PER_TURN } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Heatran2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [M];
  public weakness = [{ type: W }];
  public retreat = [C, C, C];

  public powers = [{
    // Smelt
    name: 'Smelt',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may move a Metal Energy attached to 1 of your Pokémon to Heatran. This power can\'t be used if Heatran is affected by a Special Condition.'
  }];

  public attacks = [{
    // Heavy Metal
    name: 'Heavy Metal',
    cost: [C, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'Flip a coin for each Metal Energy attached to Heatran. This attack does 40 damage plus 20 more damage for each heads.'
  }];

  public set: string = 'LA';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '30';
  public name: string = 'Heatran';
  public fullName: string = 'Heatran LA2';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Smelt
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const blockedTo: CardTarget[] = [];
      const blockedFrom: CardTarget[] = [];
      const blockedMap: { source: CardTarget; blocked: number[] }[] = [];
      let hasMetal = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (card !== this) {
          blockedTo.push(target);
        } else {
          blockedFrom.push(target);
        }
        const blocked: number[] = [];
        cardList.cards.forEach((c, index) => {
          const check = new CheckProvidedEnergyEffect(player, cardList);
          store.reduceEffect(state, check);
          const energy = check.energyMap.find(em => em.card === c);
          const providesMetal = energy?.provides.includes(M) || energy?.provides.includes(CardType.ANY);
          if (!providesMetal) {
            blocked.push(index);
          } else {
            hasMetal = true;
          }
        });
        blockedMap.push({ source: target, blocked });
      });
      if (!hasMetal) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);
      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: true, min: 1, max: 1, blockedTo, blockedFrom, blockedMap }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    // Heavy Metal
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(effect.player, effect.player.active);
      store.reduceEffect(state, checkProvidedEnergy);
      const energyCount = checkProvidedEnergy.energyMap.reduce((left, em) => {
        return left + em.provides.filter(t => t === M || t === CardType.ANY).length;
      }, 0);
      if (energyCount > 0) {
        MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, energyCount, results => {
          effect.damage += results.filter(r => r).length * 20;
        });
      }
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}

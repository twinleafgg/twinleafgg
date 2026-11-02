import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { CardTarget, EnergyCard, GameError, GameMessage, MoveEnergyPrompt, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { THIS_POKEMON_HAS_NO_WEAKNESS_DURING_OPPONENTS_NEXT_TURN } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { BLOCK_IF_HAS_SPECIAL_CONDITION, IS_POKEPOWER_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Gardevoir extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Kirlia';
  public hp: number = 120;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P, value: +30 }];
  public retreat = [C];

  public powers = [{
    name: 'Psychic Connect',
    powerType: PowerType.POKEPOWER,
    text: 'As often as you like during your turn (before your attack), you may move a Psychic Energy attached to 1 of your Benched Pokémon to your Active Pokémon. This power can\'t be used if Gardevoir is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Energy Burst',
    cost: [P],
    damage: 20,
    damageCalculation: '+',
    text: 'Does 20 damage plus 10 more damage for each Energy attached to Gardevoir and the Defending Pokémon.'
  }, {
    name: 'Psychic Protection',
    cost: [P, C, C],
    damage: 60,
    text: 'Gardevoir has no Weakness during your opponent\'s next turn.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '8';
  public name: string = 'Gardevoir';
  public fullName: string = 'Gardevoir PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Psychic Connect
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];
      const blockedMap: { source: CardTarget, blocked: number[] }[] = [];
      let hasPsychicOnBench = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, _card, target) => {
        if (target.slot === SlotType.ACTIVE) {
          blockedFrom.push(target);
        } else {
          blockedTo.push(target);
          const blocked: number[] = [];
          cardList.cards.forEach((card, index) => {
            if (
              !(card instanceof EnergyCard) ||
              (!card.provides.includes(P) && !card.provides.includes(CardType.ANY))
            ) {
              blocked.push(index);
            } else {
              hasPsychicOnBench = true;
            }
          });
          blockedMap.push({ source: target, blocked });
        }
      });
      if (!hasPsychicOnBench) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: true, min: 1, max: 1, blockedFrom, blockedTo, blockedMap }
      ), transfers => {
        if (transfers === null) {
          return;
        }
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    // Energy Burst
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      const playerEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, playerEnergy);
      const opponentEnergy = new CheckProvidedEnergyEffect(opponent, opponent.active);
      store.reduceEffect(state, opponentEnergy);
      effect.damage += 10 * (playerEnergy.energyMap.length + opponentEnergy.energyMap.length);
    }

    // Psychic Protection
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return THIS_POKEMON_HAS_NO_WEAKNESS_DURING_OPPONENTS_NEXT_TURN(store, state, effect, this);
    }

    return state;
  }
}

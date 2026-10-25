import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Card, CardTarget, ChooseEnergyPrompt, EnergyCard, GameError, GameMessage, MoveEnergyPrompt, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { BLOCK_IF_HAS_SPECIAL_CONDITION, IS_POKEPOWER_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Blastoise extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Wartortle';
  public hp: number = 130;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Wash Out',
    powerType: PowerType.POKEPOWER,
    text: 'As often as you like during your turn (before your attack), you may move a Water Energy attached to 1 of your Benched Pokémon to your Active Pokémon. This power can\'t be used if Blastoise is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Hydro Launcher',
    cost: [W, W, C, C],
    damage: 0,
    text: 'Return 2 Water Energy attached to Blastoise to your hand. Choose 1 of your opponent\'s Pokémon. This attack does 100 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '13';
  public name: string = 'Blastoise';
  public fullName: string = 'Blastoise UL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Wash Out
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];
      const blockedMap: { source: CardTarget, blocked: number[] }[] = [];
      let hasWaterOnBench = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, _card, target) => {
        if (target.slot === SlotType.ACTIVE) {
          blockedFrom.push(target);
        } else {
          blockedTo.push(target);
          const blocked: number[] = [];
          cardList.cards.forEach((card, index) => {
            if (
              !(card instanceof EnergyCard) ||
              (!card.provides.includes(CardType.WATER) && !card.provides.includes(CardType.ANY))
            ) {
              blocked.push(index);
            } else {
              hasWaterOnBench = true;
            }
          });
          blockedMap.push({ source: target, blocked });
        }
      });
      if (!hasWaterOnBench) {
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

    // Hydro Launcher
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      return store.prompt(state, new ChooseEnergyPrompt(
        player.id,
        GameMessage.CHOOSE_ENERGIES_TO_HAND,
        checkProvidedEnergy.energyMap,
        [CardType.WATER, CardType.WATER],
        { allowCancel: false }
      ), energy => {
        const cards: Card[] = (energy || []).map(e => e.card);
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.active, player.hand, { cards, sourceCard: this });
        }
        THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(100, effect, store, state);
      });
    }

    return state;
  }
}

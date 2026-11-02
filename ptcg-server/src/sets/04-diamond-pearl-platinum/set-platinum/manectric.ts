import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonPowersEffect } from '../../../game/store/effects/check-effects';
import { ATTACH_ENERGY_PROMPT, IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Manectric extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Electrike';
  public hp: number = 90;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +20 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Electric Barrier',
    powerType: PowerType.POKEBODY,
    text: 'Prevent all damage done to your Benched Pokémon (excluding any Manectric) by attacks.'
  }];

  public attacks = [{
    name: 'Power Wave',
    cost: [L],
    damage: 0,
    text: 'This attack does 30 damage to each Pokémon that has any Poké-Powers (both yours and your opponent\'s). (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Attract Current',
    cost: [C, C],
    damage: 40,
    text: 'Search your deck for a Lightning Energy card and attach it to 1 of your Pokémon. Shuffle your deck afterward.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '11';
  public name: string = 'Manectric';
  public fullName: string = 'Manectric PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Electric Barrier
    if (effect instanceof PutDamageEffect) {
      const defendingPlayer = StateUtils.findOwner(state, effect.target);
      if (!defendingPlayer.bench.includes(effect.target)) {
        return state;
      }
      const targetCard = effect.target.getPokemonCard();
      if (targetCard !== undefined && targetCard.name === 'Manectric') {
        return state;
      }

      let isInPlay = false;
      defendingPlayer.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          isInPlay = true;
        }
      });
      if (!isInPlay || IS_POKEBODY_BLOCKED(store, state, defendingPlayer, this)) {
        return state;
      }

      effect.preventDefault = true;
    }

    // Power Wave
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const damagePokemonWithPokePowers = (owner: typeof player, playerType: PlayerType) => {
        owner.forEachPokemon(playerType, (cardList, card) => {
          const checkPowers = new CheckPokemonPowersEffect(owner, card);
          store.reduceEffect(state, checkPowers);
          if (!checkPowers.powers.some(power => power.powerType === PowerType.POKEPOWER)) {
            return;
          }
          const damageEffect = cardList === owner.active
            ? new DealDamageEffect(effect, 30)
            : new PutDamageEffect(effect, 30);
          damageEffect.target = cardList;
          store.reduceEffect(state, damageEffect);
        });
      };

      damagePokemonWithPokePowers(player, PlayerType.BOTTOM_PLAYER);
      damagePokemonWithPokePowers(opponent, PlayerType.TOP_PLAYER);
    }

    // Attract Current
    if (WAS_ATTACK_USED(effect, 1, this)) {
      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        effect.player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.DECK,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
        { min: 0, max: 1, allowCancel: true }
      );
    }

    return state;
  }
}

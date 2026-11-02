import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { CardTarget, GameMessage, MoveEnergyPrompt, PlayerType, PokemonCardList, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CAN_APPLY_LOCKER_ABILITY, CAN_APPLY_LOCK_TO_TARGET, HANDLE_ABILITY_BLOCK, IS_ABILITY_LOCKER_IN_PLAY, POKEPOWER_TYPES } from '../../../game/store/prefabs/ability-lock';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, IS_POKEBODY_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Ampharos extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Flaaffy';
  public hp: number = 130;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +30 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Damage Bind',
    powerType: PowerType.POKEBODY,
    text: 'Each Pokémon that has any damage counters on it (both yours and your opponent\'s) can\'t use any Poké-Powers.'
  }];

  public attacks = [{
    name: 'Gigavolt',
    cost: [L, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 30 damage plus 30 more damage. If tails, the Defending Pokémon is now Paralyzed.'
  }, {
    name: 'Reflect Energy',
    cost: [L, C, C],
    damage: 70,
    text: 'Move an Energy card attached to Ampharos to 1 of your Benched Pokémon.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Ampharos';
  public fullName: string = 'Ampharos PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Damage Bind
    HANDLE_ABILITY_BLOCK(
      effect,
      ({ player, card }) => {
        if (!IS_ABILITY_LOCKER_IN_PLAY(state, player, this)) {
          return false;
        }

        let lockerOwner;
        try {
          lockerOwner = StateUtils.findOwner(state, StateUtils.findCardList(state, this));
        } catch {
          return false;
        }
        if (IS_POKEBODY_BLOCKED(store, state, lockerOwner, this)) {
          return false;
        }

        let cardList: PokemonCardList | undefined;
        try {
          const found = StateUtils.findCardList(state, card);
          if (found instanceof PokemonCardList) {
            cardList = found;
          }
        } catch {
          return false;
        }
        if (cardList === undefined || cardList.damage <= 0) {
          return false;
        }

        if (!CAN_APPLY_LOCKER_ABILITY(store, state, lockerOwner, this, this.powers[0])) {
          return false;
        }
        return CAN_APPLY_LOCK_TO_TARGET(store, state, lockerOwner, this, this.powers[0], card);
      },
      {
        powerTypes: POKEPOWER_TYPES,
        error: GameMessage.CANNOT_USE_POWER,
      },
    );

    // Gigavolt
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          effect.damage += 30;
        } else {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }

    // Reflect Energy
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const ampharosSlot = StateUtils.findPokemonSlot(state, this);
      if (!ampharosSlot) {
        return state;
      }
      const hasEnergyOnAmpharos = ampharosSlot.cards.some(c => c.superType === SuperType.ENERGY);
      const hasBench = player.bench.some(b => b.cards.length > 0);
      if (!hasEnergyOnAmpharos || !hasBench) {
        return state;
      }

      let ampharosTarget: CardTarget | undefined;
      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
        if (list === ampharosSlot) {
          ampharosTarget = target;
        } else {
          blockedFrom.push(target);
        }
        if (target.slot === SlotType.ACTIVE) {
          blockedTo.push(target);
        }
      });
      if (!ampharosTarget) {
        return state;
      }

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 1, max: 1, blockedFrom, blockedTo },
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    return state;
  }
}

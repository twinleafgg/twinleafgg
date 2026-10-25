import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { CardTarget, GameMessage, MoveEnergyPrompt, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Torkoal extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 80;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Super Singe',
    cost: [R],
    damage: 10,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Burned.'
  }, {
    name: 'Flame Ball',
    cost: [R, C, C],
    damage: 40,
    text: 'Move an Energy card attached to Torkoal to 1 of your Benched Pokémon.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '100';
  public name: string = 'Torkoal';
  public fullName: string = 'Torkoal PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Super Singe
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_BURNED(store, state, effect);
        }
      });
    }

    // Flame Ball
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const torkoalSlot = StateUtils.findPokemonSlot(state, this);
      if (!torkoalSlot) {
        return state;
      }
      const hasEnergyOnTorkoal = torkoalSlot.cards.some(c => c.superType === SuperType.ENERGY);
      const hasBench = player.bench.some(b => b.cards.length > 0);
      if (!hasEnergyOnTorkoal || !hasBench) {
        return state;
      }

      let torkoalTarget: CardTarget | undefined;
      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
        if (list === torkoalSlot) {
          torkoalTarget = target;
        } else {
          blockedFrom.push(target);
        }
        if (target.slot === SlotType.ACTIVE) {
          blockedTo.push(target);
        }
      });
      if (!torkoalTarget) {
        return state;
      }

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 1, max: 1, blockedFrom, blockedTo }
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

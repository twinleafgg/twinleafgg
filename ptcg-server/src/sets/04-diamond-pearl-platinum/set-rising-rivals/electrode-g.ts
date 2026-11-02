import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { CardTarget, GameMessage, MoveEnergyPrompt, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { MOVE_CARDS, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ElectrodeG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 70;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: +20 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Reckless Bomb',
    cost: [L],
    damage: 0,
    text: 'This attack does 20 damage to each of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.) Electrode G does 100 damage to itself.'
  }, {
    name: 'Reflect Energy',
    cost: [C, C],
    damage: 30,
    text: 'Move an Energy card attached to Electrode G to 1 of your Benched Pokémon.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '39';
  public name: string = 'Electrode G';
  public fullName: string = 'Electrode G RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Reckless Bomb
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      effect.damage = 20;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        if (cardList === opponent.active) {
          return;
        }
        const damageEffect = new PutDamageEffect(effect, 20);
        damageEffect.target = cardList;
        store.reduceEffect(state, damageEffect);
      });
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 100);
    }

    // Reflect Energy
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const electrodeSlot = StateUtils.findPokemonSlot(state, this);
      if (!electrodeSlot) {
        return state;
      }
      const hasEnergy = electrodeSlot.cards.some(c => c.superType === SuperType.ENERGY);
      const hasBench = player.bench.some(b => b.cards.length > 0);
      if (!hasEnergy || !hasBench) {
        return state;
      }

      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
        if (list !== electrodeSlot) {
          blockedFrom.push(target);
        }
        if (target.slot === SlotType.ACTIVE) {
          blockedTo.push(target);
        }
      });

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

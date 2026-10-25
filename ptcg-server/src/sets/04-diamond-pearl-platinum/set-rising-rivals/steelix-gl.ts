import { AttachEnergyPrompt, CardTag, CardType, EnergyCard, GameMessage, PlayerType, PokemonCard, SlotType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class SteelixGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 110;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Mend',
    cost: [C, C],
    damage: 0,
    text: 'Search your discard pile for a Metal Energy card and attach it to Steelix GL. If you do, remove 1 damage counter from Steelix GL.'
  },
  {
    name: 'Squeeze',
    cost: [M, M, C, C],
    damage: 30,
    damageCalculation: '+',
    text: 'Flip a coin. If heads, this attack does 30 damage plus 50 more damage and the Defending Pokémon is now Paralyzed.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '51';
  public name: string = 'Steelix GL';
  public fullName: string = 'Steelix GL RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Mend
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasMetal = player.discard.cards.some(c => c instanceof EnergyCard && c.name === 'Metal Energy');
      if (!hasMetal) {
        return state;
      }

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE],
        { superType: SuperType.ENERGY, name: 'Metal Energy' },
        { allowCancel: true, min: 0, max: 1 }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          store.reduceEffect(state, new AttachEnergyEffect(player, transfer.card as EnergyCard, target));
          store.reduceEffect(state, new HealEffect(player, target, 10));
        }
      });
    }

    // Squeeze
    if (WAS_ATTACK_USED(effect, 1, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          effect.damage += 50;
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }

    return state;
  }
}

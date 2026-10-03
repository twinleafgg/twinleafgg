import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { CardTarget, GameMessage, MoveEnergyPrompt, PlayerType, SlotType, StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AfterAttackEffect, EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, SWITCH_ACTIVE_WITH_BENCHED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { EnergyCard } from '../../../game/store/card/energy-card';

export class Azelf extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 60;
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Trading Places',
      cost: [C],
      damage: 0,
      text: 'Switch this Pokémon with 1 of your Benched Pokémon.'
    },
    {
      name: 'Psyjamming',
      cost: [P, C, C],
      damage: 0,
      text: 'Move as many Special Energy attached to your opponent\'s Pokémon to your opponent\'s other Pokémon in any way you like.'
    }
  ];

  public set: string = 'PLB';
  public setNumber: string = '38';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Azelf';
  public fullName: string = 'Azelf PLB';

  public usedTradingPlaces = false;
  public usedPsyjamming = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 1: Trading Places - switch after damage
    if (WAS_ATTACK_USED(effect, 0, this)) {
      this.usedTradingPlaces = true;
    }

    // Attack 2: Psyjamming - move opponent's special energy
    if (WAS_ATTACK_USED(effect, 1, this)) {
      this.usedPsyjamming = true;
    }

    if (effect instanceof AfterAttackEffect && this.usedTradingPlaces) {
      this.usedTradingPlaces = false;
      const player = effect.player;
      if (player.bench.some((b: any) => b.cards.length > 0)) {
        state = SWITCH_ACTIVE_WITH_BENCHED(store, state, player) || state;
      }
    }

    if (effect instanceof AfterAttackEffect && this.usedPsyjamming) {
      this.usedPsyjamming = false;
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Build blocked map - only allow moving Special Energy cards
      const blockedMap: { source: CardTarget, blocked: number[] }[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        const blocked: number[] = [];

        cardList.cards.forEach((c, index) => {
          if (c.superType !== SuperType.ENERGY || (c as EnergyCard).energyType !== EnergyType.SPECIAL) {
            blocked.push(index);
          }
        });

        if (blocked.length !== cardList.cards.length) {
          blockedMap.push({ source: target, blocked });
        }
      });

      if (blockedMap.length === 0) {
        return state;
      }

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.TOP_PLAYER,
        [SlotType.BENCH, SlotType.ACTIVE],
        {},
        { allowCancel: true, blockedMap }
      ), transfers => {
        if (transfers === null) {
          return;
        }

        for (const transfer of transfers) {
          if (transfer.from.player === transfer.to.player
            && transfer.from.slot === transfer.to.slot
            && transfer.from.index === transfer.to.index) {
            continue;
          }

          const source = StateUtils.getTarget(state, opponent, transfer.from);
          const target = StateUtils.getTarget(state, opponent, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    if (effect instanceof EndTurnEffect) {
      this.usedTradingPlaces = false;
      this.usedPsyjamming = false;
    }

    return state;
  }
}

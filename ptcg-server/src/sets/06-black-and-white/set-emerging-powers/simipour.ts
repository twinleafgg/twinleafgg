import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, EnergyCard, PlayerType, SlotType, CardTarget } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { MoveEnergyPrompt } from '../../../game/store/prompts/move-energy-prompt';
import { HEAL_X_DAMAGE_FROM_THIS_POKEMON } from '../../../game/store/prefabs/attack-effects';

export class Simipour extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Panpour';
  public cardType: CardType[] = [W];
  public hp: number = 90;
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Grass\' Power',
      cost: [C, C],
      damage: 30,
      text: 'If this Pokémon has any [G] Energy attached to it, heal 20 damage from this Pokémon.'
    },
    {
      name: 'Rushing Water',
      cost: [W, C, C],
      damage: 60,
      text: 'Move an Energy attached to the Defending Pokémon to 1 of your opponent\'s Benched Pokémon.'
    }
  ];

  public set: string = 'EPO';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '23';
  public name: string = 'Simipour';
  public fullName: string = 'Simipour EPO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasGrassEnergy = player.active.cards.some(c =>
        c.superType === SuperType.ENERGY && (c as EnergyCard).provides.includes(CardType.GRASS)
      );
      if (hasGrassEnergy) {
        HEAL_X_DAMAGE_FROM_THIS_POKEMON(20, effect, store, state);
      }
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const opponentActive = opponent.active;
      const hasBench = opponent.bench.some(b => b.cards.length > 0);
      const hasEnergy = opponentActive.cards.some(c => c.superType === SuperType.ENERGY);

      if (!hasBench || !hasEnergy) {
        return state;
      }

      const blockedTo: CardTarget[] = [];
      const blockedFrom: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        if (cardList === opponentActive) {
          blockedTo.push(target);
          return;
        }
        blockedFrom.push(target);
      });

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false, blockedFrom, blockedTo }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, opponent, transfer.from);
          const target = StateUtils.getTarget(state, opponent, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { CardTarget, EnergyCard, GameMessage, MoveEnergyPrompt, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_TOP_X_CARDS_FROM_YOUR_DECK, MOVE_CARDS, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Camerupt extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Numel';
  public hp: number = 120;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +30 }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Moving Fire',
    cost: [C, C],
    damage: 30,
    text: 'You may move a Fire Energy card attached to 1 of your Benched Pokémon to Camerupt.'
  }, {
    name: 'Volcanic Crash',
    cost: [R, R, C, C],
    damage: 100,
    text: 'Flip 3 coins. For each tails, discard the top card of your deck. Ignore this effect if your opponent has any Water Pokémon in play.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '18';
  public name: string = 'Camerupt';
  public fullName: string = 'Camerupt SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Moving Fire
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      let hasFireOnBench = false;
      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
        if (target.slot === SlotType.ACTIVE) {
          blockedFrom.push(target);
        } else {
          const hasFire = list.cards.some(c => c instanceof EnergyCard && c.energyType === EnergyType.BASIC && c.name === 'Fire Energy');
          if (hasFire) {
            hasFireOnBench = true;
          } else {
            blockedFrom.push(target);
          }
        }
        if (target.slot !== SlotType.ACTIVE) {
          blockedTo.push(target);
        }
      });
      if (!hasFireOnBench) {
        return state;
      }

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
        { allowCancel: true, min: 0, max: 1, blockedFrom, blockedTo }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    // Volcanic Crash
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = effect.opponent;
      let hasWater = false;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        const checkType = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, checkType);
        if (checkType.cardTypes.includes(W)) {
          hasWater = true;
        }
      });
      if (hasWater) {
        return state;
      }

      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, results => {
        results.forEach(heads => {
          if (!heads) {
            DISCARD_TOP_X_CARDS_FROM_YOUR_DECK(store, state, player, 1, this, this.attacks[1]);
          }
        });
      });
    }

    return state;
  }
}

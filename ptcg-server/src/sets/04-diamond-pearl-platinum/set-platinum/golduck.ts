import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt, EnergyCard, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { CONFIRMATION_PROMPT, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Golduck extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Psyduck';
  public hp: number = 90;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L, value: +20 }];
  public retreat = [];

  public attacks = [{
    name: 'Swim',
    cost: [],
    damage: 30,
    text: 'If your opponent has any Water Energy attached to any of his or her Pokémon, you may do 30 damage to any 1 Benched Pokémon instead. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Water Slide',
    cost: [W, C],
    damage: 40,
    damageCalculation: '+',
    text: 'You may move all Energy cards attached to Golduck to 1 of your Benched Pokémon. If you do, this attack does 40 damage plus 20 more damage.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '29';
  public name: string = 'Golduck';
  public fullName: string = 'Golduck PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Swim
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      let hasWaterEnergy = false;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        if (cardList.cards.some(c =>
          c instanceof EnergyCard && (c.provides.includes(W) || c.name === 'Water Energy')
        )) {
          hasWaterEnergy = true;
        }
      });
      const hasBenched = opponent.bench.some(b => b.cards.length > 0);
      if (!hasWaterEnergy || !hasBenched) {
        return state;
      }
      return CONFIRMATION_PROMPT(store, state, effect.player, result => {
        if (result) {
          effect.damage = 0;
          THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(30, effect, store, state);
        }
      });
    }

    // Water Slide
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const hasBench = player.bench.some(b => b.cards.length > 0);
      const attachedEnergies = player.active.cards.filter(card => card.superType === SuperType.ENERGY);
      if (!hasBench || attachedEnergies.length === 0) {
        return state;
      }
      return CONFIRMATION_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }
        effect.damage += 20;
        store.prompt(state, new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_TO_BENCH,
          player.active,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: attachedEnergies.length, max: attachedEnergies.length, sameTarget: true }
        ), transfers => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.active, target, { cards: [transfer.card], sourceCard: this });
          }
        });
      });
    }

    return state;
  }
}

import { AttachEnergyPrompt, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import {CONFIRMATION_PROMPT, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Gorebyss extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Clamperl';
  public cardType: CardType[] = [W];
  public hp: number = 90;
  public weakness = [{ type: L }];
  public retreat = [C];

  public attacks = [{
    name: 'Crescendo Wave',
    cost: [W],
    damage: 30,
    damageCalculation: 'x',
    text: 'This attack does 30 damage for each [W] Energy attached to this Pokémon. Before doing damage, you may attach as many Basic [W] Energy cards as you like from your hand to this Pokémon.'
  }];

  public regulationMark = 'I';
  public set: string = 'DRI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '56';
  public name: string = 'Gorebyss';
  public fullName: string = 'Gorebyss DRI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const energiesInHand = player.hand.cards.filter(c => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC && c.name === 'Water Energy');

      if (energiesInHand.length > 0) {
        CONFIRMATION_PROMPT(store, state, effect.player, result => {
          if (result) {

            state = store.prompt(state, new AttachEnergyPrompt(
              player.id,
              GameMessage.ATTACH_ENERGY_TO_ACTIVE,
              player.hand,
              PlayerType.BOTTOM_PLAYER,
              [SlotType.ACTIVE],
              { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Water Energy' },
              { allowCancel: false, min: 0 }
            ), transfers => {
              transfers = transfers || [];

              if (transfers.length === 0) {
                return state;
              }

              for (const transfer of transfers) {
                const target = StateUtils.getTarget(state, player, transfer.to);
                MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });
              }
            });

          }
        });
      }

      const energies = player.active.cards.filter(c => c.superType === SuperType.ENERGY && c.energyType === EnergyType.BASIC && c.name === 'Water Energy');
      effect.damage = energies.length * 30;
    }

    return state;
  }
}
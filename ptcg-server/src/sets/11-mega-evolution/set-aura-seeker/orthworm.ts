import { AttachEnergyPrompt, CardTarget, CardType, ChoosePokemonPrompt, EnergyCard, EnergyType, GameMessage, PlayerType, PokemonCard, SlotType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Orthworm extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 150;
  public cardType: CardType[] = [M];
  public weakness = [{ type: R }];
  public resistance = [{ type: G, value: -30 }];
  public retreat = [C, C, C, C];

  public attacks = [{
    name: 'Burrow and Resupply',
    cost: [M],
    damage: 0,
    text: 'Switch this Pokémon with 1 of your Benched Pokémon. Then, choose a Basic [M] Energy card from your discard pile and attach it to this Pokémon.'
  },
  {
    name: 'Smash Head',
    cost: [M, M, M],
    damage: 130,
    text: 'Choose 2 Energy attached to this Pokémon and discard them.'
  }];

  public regulationMark: string = 'J';
  public set: string = 'M7';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '62';
  public name: string = 'Orthworm';
  public fullName: string = 'Orthworm FLO';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Burrow and Resupply
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasBenched = player.bench.some(b => b.cards.length > 0);

      const attachMetalEnergy = () => {
        const hasMetal = player.discard.cards.some(
          c => c instanceof EnergyCard &&
            c.energyType === EnergyType.BASIC &&
            c.name === 'Metal Energy'
        );
        if (!hasMetal) {
          return;
        }

        const blockedTo: CardTarget[] = [];
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, _card, target) => {
          if (!cardList.cards.includes(this)) {
            blockedTo.push(target);
          }
        });

        store.prompt(state, new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Metal Energy' },
          { allowCancel: false, min: 0, max: 1, blockedTo },
        ), transfers => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.discard, target, {
              cards: [transfer.card],
              sourceCard: this,
              sourceEffect: this.attacks[0],
            });
          }
        });
      };

      if (!hasBenched) {
        attachMetalEnergy();
        return state;
      }

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_NEW_ACTIVE_POKEMON,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { allowCancel: false },
      ), selected => {
        if (selected && selected.length > 0) {
          player.switchPokemon(selected[0], store, state);
        }
        attachMetalEnergy();
      });
    }

    // Smash Head
    if (WAS_ATTACK_USED(effect, 1, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 2);
    }

    return state;
  }
}

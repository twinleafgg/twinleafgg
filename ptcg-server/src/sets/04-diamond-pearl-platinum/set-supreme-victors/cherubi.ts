import { AttachEnergyPrompt, CardTarget, CardType, EnergyType, GameMessage, PlayerType, PokemonCard, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Cherubi extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 50;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +10 }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Growth',
    cost: [],
    damage: 0,
    text: 'Attach a Grass Energy from your hand to Cherubi.'
  }, {
    name: 'Razor Leaf',
    cost: [G],
    damage: 10,
    text: ''
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '96';
  public name: string = 'Cherubi';
  public fullName: string = 'Cherubi SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Growth
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasGrassEnergy = player.hand.cards.some(c => {
        return c.superType === SuperType.ENERGY && c.name === 'Grass Energy';
      });
      if (!hasGrassEnergy) {
        return state;
      }
      const cherubiSlot = StateUtils.findPokemonSlot(state, this);
      if (!cherubiSlot) {
        return state;
      }
      let cherubiTarget: CardTarget | undefined;
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (list === cherubiSlot && card === this) {
          cherubiTarget = target;
        } else {
          blockedTo.push(target);
        }
      });
      if (!cherubiTarget) {
        return state;
      }
      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.hand,
        PlayerType.BOTTOM_PLAYER,
        [cherubiTarget.slot],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Grass Energy' },
        { min: 0, max: 1, allowCancel: true, sameTarget: true, blockedTo }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.hand, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    return state;
  }
}

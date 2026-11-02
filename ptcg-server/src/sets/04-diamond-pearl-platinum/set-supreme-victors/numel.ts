import { AttachEnergyPrompt, CardTarget, CardType, EnergyType, GameMessage, PlayerType, PokemonCard, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Numel extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +20 }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Draw In',
    cost: [C],
    damage: 0,
    text: 'Search your discard pile for up to 2 Fire Energy cards and attach them to Numel.'
  }, {
    name: 'Combustion',
    cost: [R, C, C],
    damage: 40,
    text: ''
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '74';
  public name: string = 'Numel';
  public fullName: string = 'Numel SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Draw In
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const hasEnergyInDiscard = player.discard.cards.some(c => {
        return c.superType === SuperType.ENERGY && c.name === 'Fire Energy';
      });
      if (!hasEnergyInDiscard) {
        return state;
      }
      const numelSlot = StateUtils.findPokemonSlot(state, this);
      if (!numelSlot) {
        return state;
      }
      let numelTarget: CardTarget | undefined;
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (list === numelSlot && card === this) {
          numelTarget = target;
        } else {
          blockedTo.push(target);
        }
      });
      if (!numelTarget) {
        return state;
      }
      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [numelTarget.slot],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
        { min: 0, max: 2, allowCancel: false, sameTarget: true, blockedTo }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    return state;
  }
}

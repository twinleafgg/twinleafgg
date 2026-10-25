import { CardTarget, ChooseCardsPrompt, EnergyType, GameMessage, MoveEnergyPrompt, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { DRAW_CARDS, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ElectivireFB extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [L];
  public hp: number = 90;
  public weakness = [{ type: F, value: +30 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Dump and Draw',
    cost: [C],
    damage: 0,
    text: 'Discard up to 2 Energy cards from your hand. For each card you discarded, draw 2 cards.'
  }, {
    name: 'Electric Current',
    cost: [L, C, C],
    damage: 40,
    text: 'Move a Lightning Energy card attached to Electivire FB to 1 of your Benched Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '4';
  public name: string = 'Electivire FB';
  public fullName: string = 'Electivire FB SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Dump and Draw
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const energyInHand = player.hand.cards.filter(c => c.superType === SuperType.ENERGY).length;
      if (energyInHand === 0) {
        return state;
      }
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 0, max: Math.min(2, energyInHand) }
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }
        MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
        DRAW_CARDS(store, state, player, cards.length * 2);
      });
    }

    // Electric Current
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const electivireSlot = StateUtils.findPokemonSlot(state, this);
      if (!electivireSlot) {
        return state;
      }
      const hasLightning = electivireSlot.cards.some(c =>
        c.superType === SuperType.ENERGY && c.name === 'Lightning Energy'
      );
      const hasBench = player.bench.some(b => b.cards.length > 0);
      if (!hasLightning || !hasBench) {
        return state;
      }

      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
        if (list !== electivireSlot) {
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
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
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

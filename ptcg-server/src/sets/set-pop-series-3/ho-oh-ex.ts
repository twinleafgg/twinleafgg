import { PokemonCard, CardTag, CardType, EnergyType, Stage, CardTarget, ConfirmPrompt, EnergyCard, GameMessage, MoveEnergyPrompt, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { KnockOutEffect } from '../../game/store/effects/game-effects';
import { IS_POKEPOWER_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class HoOhEx extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public hp: number = 110;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public powers = [{
    // Golden Wing
    name: 'Golden Wing',
    powerType: PowerType.POKEPOWER,
    text: 'If Ho-Oh ex would be Knocked Out by damage from an opponent\'s attack, you may move up to 2 Energy attached to Ho-Oh ex to your Pokémon in any way you like.'
  }];

  public attacks = [{
    // Rainbow Burn
    name: 'Rainbow Burn',
    cost: [C, C, C],
    damage: 10,
    damageCalculation: '+',
    text: 'Does 10 damage plus 20 more damage for each type of basic Energy card attached to Ho-Oh ex.'
  }];

  public set: string = 'P3';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '17';
  public name: string = 'Ho-Oh ex';
  public fullName: string = 'Ho-Oh ex P3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Golden Wing
    if (effect instanceof KnockOutEffect && effect.target.cards.includes(this) && effect.player.marker.hasMarker(effect.player.DAMAGE_DEALT_MARKER)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        return state;
      }
      if (!effect.target.cards.some(c => c instanceof EnergyCard)) {
        return state;
      }
      return store.prompt(state, new ConfirmPrompt(player.id, GameMessage.WANT_TO_USE_ABILITY), wantToUse => {
        if (!wantToUse) {
          return;
        }
        const blockedFrom: CardTarget[] = [];
        const blockedTo: CardTarget[] = [];
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, _card, target) => {
          if (cardList !== effect.target) {
            blockedFrom.push(target);
          } else {
            blockedTo.push(target);
          }
        });
        store.prompt(state, new MoveEnergyPrompt(
          player.id,
          GameMessage.MOVE_ENERGY_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: undefined },
          { min: 0, max: 2, allowCancel: true, blockedFrom, blockedTo }
        ), transfers => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const source = StateUtils.getTarget(state, player, transfer.from);
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
          }
        });
      });
    }
    // Rainbow Burn
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const types = new Set<CardType>();
      effect.player.active.cards.forEach(card => {
        if (card instanceof EnergyCard && card.energyType === EnergyType.BASIC) {
          card.provides.forEach(type => types.add(type));
        }
      });
      effect.damage += types.size * 20;
    }
    return state;
  }
}

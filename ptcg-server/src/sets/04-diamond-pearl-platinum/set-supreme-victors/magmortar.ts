import { CardTarget, EnergyCard, GameMessage, MoveEnergyPrompt, PlayerType, PokemonCard, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, SpecialCondition, Stage, SuperType } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { APPLY_SPECIAL_CONDITIONS_FROM_ABILITY } from '../../../game/store/prefabs/effect-of-ability-prefabs';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED, JUST_EVOLVED, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Magmortar extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Magmar';
  public hp: number = 110;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: +30 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Evolutionary Flame',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you play Magmortar from your hand to evolve 1 of your Pokémon, you may use this power. Your opponent\'s Active Pokémon is now Burned and Confused.'
  }];

  public attacks = [{
    name: 'Fire Arrow',
    cost: [R, C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 30 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Flame Ball',
    cost: [R, C, C],
    damage: 60,
    text: 'You may move a Fire Energy card attached to Magmortar to 1 of your Benched Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Magmortar';
  public fullName: string = 'Magmortar SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Evolutionary Flame
    if (JUST_EVOLVED(effect, this) && !IS_POKEPOWER_BLOCKED(store, state, effect.player, this)) {
      CONFIRMATION_PROMPT(store, state, effect.player, result => {
        if (result) {
          const player = effect.player;
          const opponent = StateUtils.getOpponent(state, player);
          APPLY_SPECIAL_CONDITIONS_FROM_ABILITY(
            store,
            state,
            player,
            this.powers[0],
            this,
            opponent.active,
            [SpecialCondition.BURNED, SpecialCondition.CONFUSED],
          );
        }
      });
    }

    // Fire Arrow
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(30, effect, store, state);
    }

    // Flame Ball
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const magmortarSlot = StateUtils.findPokemonSlot(state, this);
      if (!magmortarSlot) {
        return state;
      }
      const hasFireEnergy = magmortarSlot.cards.some(c =>
        c instanceof EnergyCard && (c.name === 'Fire Energy' || c.provides.includes(CardType.FIRE))
      );
      const hasBench = player.bench.some(b => b.cards.length > 0);
      if (!hasFireEnergy || !hasBench) {
        return state;
      }

      let magmortarTarget: CardTarget | undefined;
      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
        if (list === magmortarSlot) {
          magmortarTarget = target;
        } else {
          blockedFrom.push(target);
        }
        if (target.slot === SlotType.ACTIVE) {
          blockedTo.push(target);
        }
      });
      if (!magmortarTarget) {
        return state;
      }

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, name: 'Fire Energy' },
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

    return state;
  }
}

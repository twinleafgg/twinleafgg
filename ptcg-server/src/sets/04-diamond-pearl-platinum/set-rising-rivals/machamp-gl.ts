import { CardTag, CardType, PokemonCard, Stage, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { AFTER_ATTACK, MOVE_POKEMON_OFF_BOARD, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class MachampGL extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 100;
  public cardType: CardType[] = [F];
  public weakness = [{ type: P }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Cross-Cut',
    cost: [C, C, C],
    damage: 30,
    damageCalculation: '+',
    text: 'If the Defending Pokémon is an Evolved Pokémon, this attack does 30 damage plus 20 more damage.'
  },
  {
    name: 'Brush Off',
    cost: [F, F, C, C],
    damage: 0,
    text: 'Put the Defending Pokémon and all cards attached to it on top of your opponent\'s deck. Your opponent shuffles his or her deck afterward. (If your opponent doesn\'t have any Benched Pokémon, this attack does nothing.)'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '46';
  public name: string = 'Machamp GL';
  public fullName: string = 'Machamp GL RR';

  public usedBrushOff = false;

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cross-Cut
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.opponent.active.getPokemons().length > 1) {
        effect.damage += 20;
      }
    }

    // Brush Off
    if (WAS_ATTACK_USED(effect, 1, this)) {
      this.usedBrushOff = effect.opponent.bench.some(b => b.cards.length > 0);
    }

    if (AFTER_ATTACK(effect, 1, this) && this.usedBrushOff) {
      this.usedBrushOff = false;
      const opponent = StateUtils.getOpponent(state, effect.player);
      MOVE_POKEMON_OFF_BOARD(store, state, opponent.active, { pokemonDestination: opponent.deck, sourceCard: this });
      SHUFFLE_DECK(store, state, opponent);
    }

    if (effect instanceof EndTurnEffect) {
      this.usedBrushOff = false;
    }

    return state;
  }
}

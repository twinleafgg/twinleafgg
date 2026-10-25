import { PokemonCard, Stage, CardType, CardTag, SpecialCondition, PowerType, StoreLike, State, StateUtils, PlayerType } from '../../game';
import { CheckProvidedEnergyEffect } from '../../game/store/effects/check-effects';
import { Effect } from '../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../game/store/effects/play-card-effects';
import { APPLY_SPECIAL_CONDITIONS_FROM_ABILITY } from '../../game/store/prefabs/effect-of-ability-prefabs';
import { CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class EspeonStar extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.STAR];
  public hp: number = 70;
  public cardType: CardType[] = [P];
  public weakness = [{ type: P }];
  public retreat = [C];

  public powers = [{
    // Purple Ray
    name: 'Purple Ray',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you put Espeon Star from your hand onto your Bench, you may use this power. Each Active Pokémon (both yours and your opponent\'s) is now Confused.',
  }];

  public attacks = [{
    // Psychic Boom
    name: 'Psychic Boom',
    cost: [P, P, C],
    damage: 30,
    text: 'Does 30 damage plus 10 more damage for each Energy attached to the Defending Pokémon.',
  }];

  public set: string = 'P5';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '16';
  public name: string = 'Espeon Star';
  public fullName: string = 'Espeon Star P5';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Purple Ray
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this && !IS_POKEPOWER_BLOCKED(store, state, effect.player, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      CONFIRMATION_PROMPT(store, state, player, result => {
        if (!result) { return state; }
        APPLY_SPECIAL_CONDITIONS_FROM_ABILITY(
          store,
          state,
          player,
          this.powers[0],
          this,
          player.active,
          [SpecialCondition.CONFUSED],
        );
        APPLY_SPECIAL_CONDITIONS_FROM_ABILITY(
          store,
          state,
          player,
          this.powers[0],
          this,
          opponent.active,
          [SpecialCondition.CONFUSED],
        );
      });
    }
    // Psychic Boom
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = effect.opponent;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
        if (cardList === opponent.active) {
          const checkProvidedEnergy = new CheckProvidedEnergyEffect(opponent, cardList);
          store.reduceEffect(state, checkProvidedEnergy);
          const damagePerEnergy = 10;
          effect.damage += checkProvidedEnergy.energyMap.length * damagePerEnergy;
        }
      });
    }
    return state;
  }
}

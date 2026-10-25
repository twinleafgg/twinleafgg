import { GameError, GameMessage, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, SpecialCondition, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { APPLY_SPECIAL_CONDITIONS_FROM_ABILITY } from '../../../game/store/prefabs/effect-of-ability-prefabs';
import { DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { ABILITY_USED, ADD_MARKER, HAS_MARKER, REMOVE_MARKER, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class SkuntankG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [P];
  public hp: number = 80;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public powers = [{
    name: 'Poison Structure',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), if you have a Stadium card in play, you may use this power. Each Active Pokémon (both yours and your opponent\'s) (excluding Pokémon SP) is now Poisoned. This power can\'t be used if Skuntank is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Smokescreen',
    cost: [C, C],
    damage: 20,
    text: 'If the Defending Pokémon tries to attack during your opponent\'s next turn, your opponent flips a coin. If tails, that attack does nothing.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '94';
  public name: string = 'Skuntank G';
  public fullName: string = 'Skuntank G PL';

  public readonly POISON_STRUCTURE_MARKER = 'POISON_STRUCTURE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const stadiumCard = StateUtils.getStadiumCard(state);

      if (stadiumCard === undefined) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const cardList = StateUtils.findCardList(state, stadiumCard);
      const stadiumOwner = StateUtils.findOwner(state, cardList);

      if (stadiumOwner !== player) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (HAS_MARKER(this.POISON_STRUCTURE_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      if (player.active.cards[0] === this && player.active.specialConditions.length > 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (!player.active?.getPokemonCard()?.hasTag(CardTag.POKEMON_SP)) {
        APPLY_SPECIAL_CONDITIONS_FROM_ABILITY(
          store,
          state,
          player,
          this.powers[0],
          this,
          player.active,
          [SpecialCondition.POISONED]
        );
      }

      if (!opponent.active?.getPokemonCard()?.hasTag(CardTag.POKEMON_SP)) {
        APPLY_SPECIAL_CONDITIONS_FROM_ABILITY(
          store,
          state,
          player,
          this.powers[0],
          this,
          opponent.active,
          [SpecialCondition.POISONED]
        );
      }

      ADD_MARKER(this.POISON_STRUCTURE_MARKER, player, this);
      ABILITY_USED(player, this);
    }

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      REMOVE_MARKER(this.POISON_STRUCTURE_MARKER, effect.player, this);
    }

    // Smokescreen
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK(store, state, effect, this);
    }

    if (effect instanceof EndTurnEffect) {
      if (HAS_MARKER(this.POISON_STRUCTURE_MARKER, effect.player, this)) {
        REMOVE_MARKER(this.POISON_STRUCTURE_MARKER, effect.player, this);
      }
    }

    return state;
  }
}

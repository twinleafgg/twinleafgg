import { GameError, GameMessage, PlayerType, PowerType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, SpecialCondition, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonAttacksEffect, CheckPokemonPowersEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class BlazikenFBLVX extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom: string = 'Blaziken FB';
  protected _tags = [CardTag.POKEMON_LV_X, CardTag.POKEMON_SP];
  public hp: number = 110;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public retreat = [C];

  public powers = [{
    name: 'Burning Spirit',
    powerType: PowerType.POKEBODY,
    text: 'Any damage done by attacks to a Burned Pokémon (both yours and your opponent\'s) is increased by 40 (after applying Weakness and Resistance). No more than 40 damage can be added by all Burning Spirit Poké-Bodies.'
  }];

  public attacks = [{
    name: 'Jet Shoot',
    cost: [R, C],
    damage: 80,
    text: 'During your opponent\'s next turn, any damage done to Blaziken FB by attacks is increased by 40 (after applying Weakness and Resistance).'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '142';
  public name: string = 'Blaziken FB';
  public fullName: string = 'Blaziken FB LV.X SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      if (effect.target !== effect.player.active) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Burning Spirit
    if (effect instanceof PutDamageEffect && effect.target.specialConditions.includes(SpecialCondition.BURNED)) {
      const owner = StateUtils.findOwner(state, StateUtils.findCardList(state, this));
      let isInPlay = false;
      let firstBurningSpirit: PokemonCard | undefined;
      for (const p of state.players) {
        p.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
          if (card === this) {
            isInPlay = true;
          }
          if (firstBurningSpirit === undefined && card.powers.some(power => power.name === 'Burning Spirit')) {
            firstBurningSpirit = card;
          }
        });
      }
      if (!isInPlay || firstBurningSpirit !== this || IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      effect.damage += 40;
    }

    // Jet Shoot
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.player.active.damageReductionNextTurn = -40;
    }

    if (effect instanceof CheckTableStateEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner !== player) {
        return state;
      }
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          player.showAllStageAbilities = true;
        }
      });
    }

    if (effect instanceof CheckPokemonAttacksEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner !== player) {
        return state;
      }
      let isThisInPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          isThisInPlay = true;
        }
      });
      if (!isThisInPlay) {
        return state;
      }
      for (const evolutionCard of cardList.cards) {
        if (evolutionCard.superType === SuperType.POKEMON && evolutionCard !== this && evolutionCard.name === this.evolvesFrom) {
          effect.attacks.push(...((evolutionCard as PokemonCard).attacks || []));
        }
      }
    }

    if (effect instanceof CheckPokemonPowersEffect) {
      const player = effect.player;
      const cardList = StateUtils.findCardList(state, this);
      const owner = StateUtils.findOwner(state, cardList);
      if (owner !== player) {
        return state;
      }
      let isThisInPlay = false;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          isThisInPlay = true;
        }
      });
      if (!isThisInPlay) {
        return state;
      }
      for (const evolutionCard of cardList.cards) {
        if (evolutionCard.superType === SuperType.POKEMON && evolutionCard !== this && evolutionCard.name === this.evolvesFrom) {
          effect.powers.push(...((evolutionCard as PokemonCard).powers || []));
        }
      }
    }

    return state;
  }
}

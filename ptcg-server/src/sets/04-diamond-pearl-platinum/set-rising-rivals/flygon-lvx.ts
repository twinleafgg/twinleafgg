import { CardTarget, ChoosePokemonPrompt, GameError, GameMessage, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonAttacksEffect, CheckPokemonPowersEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { BetweenTurnsEffect } from '../../../game/store/effects/game-phase-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { IS_POKEBODY_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class FlygonLVX extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom = 'Flygon';
  public cardType: CardType[] = [C];
  protected _tags = [CardTag.POKEMON_LV_X];
  public hp: number = 140;
  public weakness = [{ type: C, value: +30 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Wind Erosion',
    powerType: PowerType.POKEBODY,
    text: 'As long as Flygon is your Active Pokémon, discard the top card from your opponent\'s deck between turns.'
  }];

  public attacks = [{
    name: 'Extreme Attack',
    cost: [C, C, C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon LV.X. This attack does 150 damage to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon).'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '105';
  public name: string = 'Flygon';
  public fullName: string = 'Flygon LV.X RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Wind Erosion
    if (effect instanceof BetweenTurnsEffect && effect.player.active.getPokemonCard() === this) {
      const player = effect.player;
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      const opponent = StateUtils.getOpponent(state, player);
      MOVE_CARDS(store, state, opponent.deck, opponent.discard, { count: 1, sourceCard: this });
    }

    // Extreme Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const blocked: CardTarget[] = [];
      let hasLvX = false;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (_cardList, card, target) => {
        if (card.hasTag(CardTag.POKEMON_LV_X) || card.stage === Stage.LV_X) {
          hasLvX = true;
        } else {
          blocked.push(target);
        }
      });
      if (!hasLvX) {
        return state;
      }

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false, blocked }
      ), selected => {
        if (!selected || selected.length === 0) {
          return;
        }
        const target = selected[0];
        const damageEffect = target === opponent.active
          ? new DealDamageEffect(effect, 150)
          : new PutDamageEffect(effect, 150);
        damageEffect.target = target;
        store.reduceEffect(state, damageEffect);
      });
    }

    // making sure it gets put on the active pokemon
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      if (effect.target !== effect.player.active) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Trying to get all of the previous stage's attacks and powers
    if (effect instanceof CheckTableStateEffect) {
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
          player.showAllStageAbilities = true;
        }
      });

      if (!isThisInPlay) {
        return state;
      }
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
          effect.attacks.push(...(evolutionCard.attacks || []));
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
          effect.powers.push(...(evolutionCard.powers || []));
        }
      }
    }

    return state;
  }
}

import { AttachEnergyPrompt, GameError, GameMessage, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { AfterDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckHpEffect, CheckPokemonAttacksEffect, CheckPokemonPowersEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { CONFIRMATION_PROMPT, DISCARD_ALL_ENERGY_FROM_POKEMON, IS_POKEBODY_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class RayquazaCLVX extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom: string = 'Rayquaza C';
  protected _tags = [CardTag.POKEMON_LV_X, CardTag.POKEMON_SP];
  public hp: number = 120;
  public cardType: CardType[] = [C];
  public weakness = [{ type: C }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Dragon Spirit',
    powerType: PowerType.POKEBODY,
    text: 'If Rayquaza C is your Active Pokémon and is damaged but not Knocked Out by an opponent\'s attack, you may search your discard pile for an Energy card and attach it to Rayquaza C.'
  }];

  public attacks = [{
    name: 'Final Blowup',
    cost: [W, P, F, C],
    damage: 200,
    text: 'Discard all Energy attached to Rayquaza C. Ignore this effect if you have no cards in your hand.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '146';
  public name: string = 'Rayquaza C';
  public fullName: string = 'Rayquaza C LV.X SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      if (effect.target !== effect.player.active) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Dragon Spirit
    if (effect instanceof AfterDamageEffect && effect.target.getPokemonCard() === this && effect.damage > 0) {
      const owner = StateUtils.findOwner(state, effect.target);
      if (owner.active !== effect.target || effect.player === owner) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }
      const checkHp = new CheckHpEffect(owner, effect.target);
      store.reduceEffect(state, checkHp);
      if (effect.target.damage >= checkHp.hp) {
        return state;
      }
      if (!owner.discard.cards.some(c => c.superType === SuperType.ENERGY)) {
        return state;
      }

      CONFIRMATION_PROMPT(store, state, owner, wantToUse => {
        if (!wantToUse) {
          return;
        }
        store.prompt(state, new AttachEnergyPrompt(
          owner.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          owner.discard,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE],
          { superType: SuperType.ENERGY },
          { min: 1, max: 1, allowCancel: false }
        ), transfers => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, owner, transfer.to);
            MOVE_CARDS(store, state, owner.discard, target, { cards: [transfer.card], sourceCard: this });
          }
        });
      });
    }

    // Final Blowup
    if (WAS_ATTACK_USED(effect, 0, this)) {
      if (effect.player.hand.cards.length > 0) {
        DISCARD_ALL_ENERGY_FROM_POKEMON(store, state, effect, this);
      }
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

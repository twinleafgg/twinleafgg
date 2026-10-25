import { AttachEnergyPrompt, CardTag, CardType, ChoosePokemonPrompt, EnergyType, GameError, GameMessage, PlayerType, PokemonCard, PowerType, SlotType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { CheckPokemonAttacksEffect, CheckPokemonPowersEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, COIN_FLIP_PROMPT, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class TangrowthLVX extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom: string = 'Tangrowth';
  protected _tags = [CardTag.POKEMON_LV_X];
  public hp: number = 130;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Healing Growth',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may flip a coin. If heads, remove 4 damage counters from 1 of your Pokémon. This power can\'t be used if Tangrowth is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Big Growth',
    cost: [G],
    damage: 0,
    text: 'Search your discard pile for as many Grass Energy cards as you like and attach them to your Pokémon in any way you like.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '99';
  public name: string = 'Tangrowth';
  public fullName: string = 'Tangrowth LV.X AR';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      if (effect.target !== effect.player.active) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Healing Growth
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }
        store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_HEAL,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          const target = selected && selected[0];
          if (target) {
            store.reduceEffect(state, new HealEffect(player, target, 40));
          }
        });
      });
    }

    // Big Growth
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const grassCount = player.discard.cards.filter(c =>
        c.superType === SuperType.ENERGY && c.name === 'Grass Energy'
      ).length;
      if (grassCount === 0) {
        return state;
      }
      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Grass Energy' },
        { allowCancel: true, min: 0, max: grassCount }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);

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

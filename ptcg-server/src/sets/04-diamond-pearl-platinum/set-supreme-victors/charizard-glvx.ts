import { CardTarget, GameError, GameMessage, MoveEnergyPrompt, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckPokemonAttacksEffect, CheckPokemonPowersEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { BLOCK_IF_HAS_SPECIAL_CONDITION, COIN_FLIP_PROMPT, DISCARD_ALL_ENERGY_FROM_POKEMON, IS_POKEPOWER_BLOCKED, MOVE_CARDS, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class CharizardGLVX extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom: string = 'Charizard G';
  protected _tags = [CardTag.POKEMON_LV_X, CardTag.POKEMON_SP];
  public hp: number = 120;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Call for Power',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'As often as you like during your turn (before your attack), you may move an Energy attached to 1 of your Pokémon to Charizard G. This power can\'t be used if Charizard G is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Malevolent Fire',
    cost: [R, R, C, C, C],
    damage: 150,
    text: 'Flip a coin. If tails, discard all Energy attached to Charizard G.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '143';
  public name: string = 'Charizard G';
  public fullName: string = 'Charizard G LV.X SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      if (effect.target !== effect.player.active) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Call for Power
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const charizardSlot = StateUtils.findPokemonSlot(state, this);
      if (!charizardSlot) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      let charizardTarget: CardTarget | undefined;
      const blockedTo: CardTarget[] = [];
      const blockedFrom: CardTarget[] = [];
      let hasEnergyToMove = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
        if (list === charizardSlot) {
          charizardTarget = target;
          blockedFrom.push(target);
        } else {
          blockedTo.push(target);
          if (list.cards.some(c => c.superType === SuperType.ENERGY)) {
            hasEnergyToMove = true;
          }
        }
      });
      if (!charizardTarget || !hasEnergyToMove) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: true, min: 1, max: 1, blockedTo, blockedFrom }
      ), transfers => {
        if (!transfers) {
          return;
        }
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    // Malevolent Fire
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (!result) {
          DISCARD_ALL_ENERGY_FROM_POKEMON(store, state, effect, this);
        }
      });
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

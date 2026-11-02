import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt, EnergyCard, GameError, GameMessage, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckHpEffect, CheckPokemonAttacksEffect, CheckPokemonPowersEffect, CheckPokemonTypeEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { AttachEnergyEffect, PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class ShayminLVX extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom: string = 'Shaymin';
  protected _tags = [CardTag.POKEMON_LV_X];
  public hp: number = 100;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R }];
  public resistance = [{ type: W, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Thankfulness',
    powerType: PowerType.POKEBODY,
    text: 'Each of your Grass Pokémon (excluding any Shaymin) gets +40 HP. You can\'t use more than 1 Thankfulness Poké-Body each turn.'
  }];

  public attacks = [{
    name: 'Seed Flare',
    cost: [G, C, C],
    damage: 40,
    damageCalculation: '+',
    text: 'Choose as many Grass Energy cards from your hand as you like and attach them to your Pokémon in any way you like. If you do, this attack does 40 damage plus 20 more damage for each Grass Energy attached in this way.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '126';
  public name: string = 'Shaymin';
  public fullName: string = 'Shaymin LV.X PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Lv.X must be played onto Active
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      if (effect.target !== effect.player.active) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Thankfulness
    if (effect instanceof CheckHpEffect) {
      const owner = StateUtils.findOwner(state, effect.target);
      const targetCard = effect.target.getPokemonCard();
      if (targetCard === undefined || targetCard.name === 'Shaymin') {
        return state;
      }

      let isInPlay = false;
      let firstThankfulness: PokemonCard | undefined;
      owner.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card) => {
        if (card === this) {
          isInPlay = true;
        }
        if (firstThankfulness === undefined && card.powers.some(power => power.name === 'Thankfulness')) {
          firstThankfulness = card;
        }
      });
      if (!isInPlay || firstThankfulness !== this) {
        return state;
      }
      if (IS_POKEBODY_BLOCKED(store, state, owner, this)) {
        return state;
      }

      const checkType = new CheckPokemonTypeEffect(effect.target);
      store.reduceEffect(state, checkType);
      if (checkType.cardTypes.includes(CardType.GRASS)) {
        effect.hp += 40;
      }
    }

    // Seed Flare
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.hand,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Grass Energy' },
        { min: 0, allowCancel: true }
      ), transfers => {
        const attached = transfers || [];
        for (const transfer of attached) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          store.reduceEffect(state, new AttachEnergyEffect(player, transfer.card as EnergyCard, target));
        }
        effect.damage += 20 * attached.length;
      });
    }

    // Inherit previous stage attacks / powers
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
        if (
          evolutionCard.superType === SuperType.POKEMON &&
          evolutionCard !== this &&
          evolutionCard.name === this.evolvesFrom
        ) {
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
        if (
          evolutionCard.superType === SuperType.POKEMON &&
          evolutionCard !== this &&
          evolutionCard.name === this.evolvesFrom
        ) {
          effect.powers.push(...(evolutionCard.powers || []));
        }
      }
    }

    return state;
  }
}

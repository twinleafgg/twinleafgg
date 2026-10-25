import { CardTag, CardType, ChoosePokemonPrompt, GameError, GameMessage, PlayerType, PokemonCard, PowerType, SlotType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { ApplyWeaknessEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckPokemonAttacksEffect, CheckPokemonPowersEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, SHUFFLE_DECK, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class GengarLVX extends PokemonCard {
  public stage: Stage = Stage.LV_X;
  public evolvesFrom: string = 'Gengar';
  protected _tags = [CardTag.POKEMON_LV_X];
  public hp: number = 140;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Level-Down',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may choose 1 of your opponent\'s Pokémon LV.X. Remove the Level-Up card from that Pokémon and have your opponent shuffle that card into his or her deck. The power can\'t be used if Gengar is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Compound Pain',
    cost: [P, P, C],
    damage: 0,
    text: 'This attack does 30 damage to each of your opponent\'s Pokémon that already has any damage counters on it. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '97';
  public name: string = 'Gengar';
  public fullName: string = 'Gengar LV.X AR';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      if (effect.target !== effect.player.active) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
    }

    // Level-Down
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      const blocked: { player: PlayerType; slot: SlotType; index: number }[] = [];
      let hasLvX = false;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (list, card, target) => {
        if (card.stage === Stage.LV_X || card.hasTag(CardTag.POKEMON_LV_X)) {
          hasLvX = true;
        } else {
          blocked.push(target);
        }
      });
      if (!hasLvX) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false, blocked }
      ), selected => {
        const target = selected && selected[0];
        if (!target) {
          return;
        }
        const lvX = target.cards.find(c =>
          c instanceof PokemonCard && (c.stage === Stage.LV_X || c.hasTag(CardTag.POKEMON_LV_X))
        );
        if (!lvX) {
          return;
        }
        MOVE_CARDS(store, state, target, opponent.deck, { cards: [lvX], sourceCard: this });
        SHUFFLE_DECK(store, state, opponent);
      });
    }

    // Compound Pain
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        if (cardList.damage === 0) {
          return;
        }
        let damage = 30;
        if (cardList === opponent.active) {
          const applyWeakness = new ApplyWeaknessEffect(effect, damage);
          store.reduceEffect(state, applyWeakness);
          damage = applyWeakness.damage;
        }
        const damageEffect = new PutDamageEffect(effect, damage);
        damageEffect.target = cardList;
        store.reduceEffect(state, damageEffect);
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

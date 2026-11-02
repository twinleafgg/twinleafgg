import { DamageMap, GameError, GameMessage, MoveDamagePrompt, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CheckHpEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { ABILITY_USED, ADD_MARKER, AFTER_ATTACK, BLOCK_IF_HAS_SPECIAL_CONDITION, CONFIRMATION_PROMPT, HAS_MARKER, IS_POKEPOWER_BLOCKED, REMOVE_MARKER, REMOVE_MARKER_AT_END_OF_TURN, SWITCH_ACTIVE_WITH_BENCHED, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Gengar extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Haunter';
  public hp: number = 110;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D, value: +30 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [];

  public powers = [{
    name: 'Curse',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may move 1 damage counter from 1 of your opponent\'s Pokémon to another of your opponent\'s Pokémon. This power can\'t be used if Gengar is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Shadow Skip',
    cost: [P, P, C],
    damage: 60,
    text: 'Does 10 damage to 1 of your opponent\'s Benched Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.) You may switch Gengar with 1 of your Benched Pokémon.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '16';
  public name: string = 'Gengar';
  public fullName: string = 'Gengar AR';

  public readonly CURSE_MARKER = 'CURSE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      REMOVE_MARKER(this.CURSE_MARKER, effect.player, this);
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.CURSE_MARKER, this);

    // Curse
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      if (HAS_MARKER(this.CURSE_MARKER, player, this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      let hasDamagedPokemon = false;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        if (cardList.damage > 0) {
          hasDamagedPokemon = true;
        }
      });
      if (!hasDamagedPokemon) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const maxAllowedDamage: DamageMap[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        const checkHpEffect = new CheckHpEffect(opponent, cardList);
        store.reduceEffect(state, checkHpEffect);
        maxAllowedDamage.push({ target, damage: checkHpEffect.hp });
      });

      return store.prompt(state, new MoveDamagePrompt(
        player.id,
        GameMessage.MOVE_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        maxAllowedDamage,
        { allowCancel: true, min: 1, max: 1 }
      ), transfers => {
        if (transfers === null) {
          return;
        }
        ADD_MARKER(this.CURSE_MARKER, player, this);
        ABILITY_USED(player, this);
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          if (source.damage >= 10) {
            source.damage -= 10;
            target.damage += 10;
          }
        }
      });
    }

    // Shadow Skip
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_BENCHED_POKEMON(10, effect, store, state);
    }

    if (AFTER_ATTACK(effect, 0, this)) {
      CONFIRMATION_PROMPT(store, state, effect.player, result => {
        if (result) {
          SWITCH_ACTIVE_WITH_BENCHED(store, state, effect.player);
        }
      }, GameMessage.WANT_TO_SWITCH_POKEMON);
    }

    return state;
  }
}

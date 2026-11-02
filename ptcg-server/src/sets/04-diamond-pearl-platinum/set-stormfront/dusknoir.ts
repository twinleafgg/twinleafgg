import { PokemonCard } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { ChooseCardsPrompt } from '../../../game';
import { ChoosePokemonPrompt } from '../../../game';
import { EnergyCard } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { PlayerType } from '../../../game';
import { PowerType } from '../../../game';
import { SlotType } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { AbstractAttackEffect } from '../../../game/store/effects/attack-effects';
import { PutCountersEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { ABILITY_USED } from '../../../game/store/prefabs/prefabs';
import { ADD_MARKER } from '../../../game/store/prefabs/prefabs';
import { BLOCK_IF_HAS_SPECIAL_CONDITION } from '../../../game/store/prefabs/prefabs';
import { DRAW_CARDS } from '../../../game/store/prefabs/prefabs';
import { HAS_MARKER } from '../../../game/store/prefabs/prefabs';
import { IS_POKEPOWER_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { REMOVE_MARKER } from '../../../game/store/prefabs/prefabs';
import { USE_ABILITY_ONCE_PER_TURN } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Dusknoir extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Dusclops';
  public hp: number = 120;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D, value: +30 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C, C, C];

  public powers = [{
    // Shadow Command
    name: 'Shadow Command',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may draw 2 cards. If you have 7 or more cards in your hand, discard a number of cards until you have 6 cards in your hand. Then, put 2 damage counters on Dusknoir. This power can\'t be used if Dusknoir is affected by a Special Condition.'
  }];

  public attacks = [{
    // Damage Even
    name: 'Damage Even',
    cost: [P, C],
    damage: 0,
    text: 'Count the number of damage counters on Dusknoir. Put that many damage counters on 1 of your opponent\'s Pokémon.'
  }, {
    // Night Spin
    name: 'Night Spin',
    cost: [P, P, C],
    damage: 50,
    text: 'Prevent all effects of an attack, including damage, done to Dusknoir by your opponent\'s Pokémon that has 2 or less Energy attached to it during your opponent\'s next turn.'
  }];

  public set: string = 'SF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Dusknoir';
  public fullName: string = 'Dusknoir SF';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';
  public readonly NIGHT_SPIN_MARKER = 'NIGHT_SPIN_MARKER';
  public readonly NIGHT_SPIN_CLEAR_MARKER = 'NIGHT_SPIN_CLEAR_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Shadow Command
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      USE_ABILITY_ONCE_PER_TURN(player, this.ABILITY_USED_MARKER, this);
      ABILITY_USED(player, this);
      DRAW_CARDS(store, state, player, 2);
      const extra = player.hand.cards.length - 6;
      const finish = () => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, list => {
          if (list.getPokemonCard() === this) {
            list.damage += 20;
          }
        });
      };
      if (extra > 0) {
        return store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          {},
          { min: extra, max: extra, allowCancel: false }
        ), selected => {
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: selected || [], sourceCard: this });
          finish();
        });
      }
      finish();
    }

    // Damage Even
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const counters = Math.floor(effect.player.active.damage / 10);
      if (counters === 0) {
        return state;
      }
      return store.prompt(state, new ChoosePokemonPrompt(
        effect.player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), targets => {
        if (!targets || targets.length === 0) {
          return;
        }
        const putCounters = new PutCountersEffect(effect, counters * 10);
        putCounters.target = targets[0];
        store.reduceEffect(state, putCounters);
      });
    }

    // Night Spin
    if (WAS_ATTACK_USED(effect, 1, this)) {
      ADD_MARKER(this.NIGHT_SPIN_MARKER, effect.player, this);
    }

    if (effect instanceof AbstractAttackEffect && HAS_MARKER(this.NIGHT_SPIN_MARKER, effect.opponent, this)) {
      if (effect.target.getPokemonCard() === this) {
        const energyCount = effect.source.cards.filter(c => c instanceof EnergyCard).length;
        if (energyCount <= 2) {
          effect.preventDefault = true;
        }
      }
    }

    if (effect instanceof EndTurnEffect) {
      state.players.forEach(player => {
        if (HAS_MARKER(this.NIGHT_SPIN_CLEAR_MARKER, player, this)) {
          REMOVE_MARKER(this.NIGHT_SPIN_MARKER, player, this);
          REMOVE_MARKER(this.NIGHT_SPIN_CLEAR_MARKER, player, this);
        } else if (HAS_MARKER(this.NIGHT_SPIN_MARKER, player, this)) {
          ADD_MARKER(this.NIGHT_SPIN_CLEAR_MARKER, player, this);
        }
      });
      REMOVE_MARKER(this.ABILITY_USED_MARKER, effect.player, this);
    }

    return state;
  }
}

import { CardTarget } from '../../../game';
import { ChooseCardsPrompt } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { PlayerType } from '../../../game';
import { PowerType } from '../../../game';
import { SlotType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED } from '../../../game/store/prefabs/prefabs';
import { BLOCK_IF_HAS_SPECIAL_CONDITION } from '../../../game/store/prefabs/prefabs';
import { COIN_FLIP_PROMPT } from '../../../game/store/prefabs/prefabs';
import { IS_POKEPOWER_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { MOVE_DAMAGE_COUNTERS } from '../../../game/store/prefabs/prefabs';
import { REMOVE_MARKER_AT_END_OF_TURN } from '../../../game/store/prefabs/prefabs';
import { SHOW_CARDS_TO_PLAYER } from '../../../game/store/prefabs/prefabs';
import { USE_ABILITY_ONCE_PER_TURN } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Dusknoir extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Dusclops';
  public hp: number = 130;
  public cardType: CardType[] = [P];
  public weakness = [{ type: D, value: 30 }];
  public resistance = [{ type: C, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Dark Hide',
    powerType: PowerType.POKEPOWER,
    useWhenInPlay: true,
    text: 'Once during your turn (before your attack), you may flip a coin. If heads, look at your opponent\'s hand, choose a Pokémon you find there, and put it on the bottom of his or her deck. This power can\'t be used if Dusknoir is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Reaper Pulse',
    cost: [P, P, C],
    damage: 70,
    text: 'Move up to 2 damage counters from Dusknoir to 1 of your opponent\'s Benched Pokémon.'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP33';
  public name: string = 'Dusknoir';
  public fullName: string = 'Dusknoir DPP';

  public readonly ABILITY_USED_MARKER = 'ABILITY_USED_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Dark Hide
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
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
        SHOW_CARDS_TO_PLAYER(store, state, player, opponent.hand.cards);
        const pokemonInHand = opponent.hand.cards.filter(c => c instanceof PokemonCard);
        if (pokemonInHand.length === 0) {
          return;
        }
        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DECK,
          opponent.hand,
          { superType: SuperType.POKEMON },
          { min: 1, max: 1, allowCancel: false }
        ), selected => {
          const cards = selected || [];
          if (cards.length === 0) {
            return;
          }
          MOVE_CARDS(store, state, opponent.hand, opponent.deck, { cards, toBottom: true, sourceCard: this });
        });
      });
    }

    // Reaper Pulse
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (player.active.damage === 0 || !opponent.bench.some(b => b.cards.length > 0)) {
        return state;
      }
      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
        if (list !== player.active) {
          blockedFrom.push(target);
        }
        blockedTo.push(target);
      });
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (list, _card, target) => {
        blockedFrom.push(target);
        if (list === opponent.active) {
          blockedTo.push(target);
        }
      });
      MOVE_DAMAGE_COUNTERS(store, state, player, {
        playerType: PlayerType.ANY,
        slots: [SlotType.ACTIVE, SlotType.BENCH],
        min: 0,
        max: 2,
        allowCancel: true,
        blockedFrom,
        blockedTo,
        singleSourceTarget: true,
        singleDestinationTarget: true,
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.ABILITY_USED_MARKER, this);
    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { CardTarget, ChooseCardsPrompt, ChoosePokemonPrompt, GameError, GameMessage, PlayerType, PokemonCardList, PowerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import { ABILITY_USED, BLOCK_IF_HAS_SPECIAL_CONDITION, DRAW_CARDS_UNTIL_CARDS_IN_HAND, HAS_MARKER, IS_POKEPOWER_BLOCKED, MOVE_CARDS, REMOVE_MARKER, THIS_POKEMON_DOES_DAMAGE_TO_ITSELF, USE_ABILITY_ONCE_PER_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Blissey extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Chansey';
  public hp: number = 120;
  public cardType: CardType[] = [C];
  public weakness = [{ type: F, value: +30 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Nurse Call',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), you may discard a card from your hand. If you do, remove 2 damage counters from 1 of your Pokémon. You can\'t use more than 1 Nurse Call Poké-Power each turn. This power can\'t be used if Blissey is affected by a Special Condition.',
    useWhenInPlay: true
  }];

  public attacks = [{
    name: 'Return',
    cost: [C],
    damage: 20,
    text: 'Draw cards until you have 6 cards in your hand.'
  }, {
    name: 'Double-edge',
    cost: [C, C, C, C],
    damage: 100,
    text: 'Blissey does 60 damage to itself.'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '22';
  public name: string = 'Blissey';
  public fullName: string = 'Blissey PL';

  public readonly NURSE_CALL_MARKER = 'NURSE_CALL_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Nurse Call
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }
      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);
      if (HAS_MARKER(this.NURSE_CALL_MARKER, player)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }
      if (player.hand.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const blocked: CardTarget[] = [];
      let hasPokemonWithDamage = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, _card, target) => {
        if (cardList.damage === 0) {
          blocked.push(target);
        } else {
          hasPokemonWithDamage = true;
        }
      });
      if (!hasPokemonWithDamage) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.NURSE_CALL_MARKER, this);
      ABILITY_USED(player, this);

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        {},
        { min: 1, max: 1, allowCancel: true }
      ), selected => {
        const cards = selected || [];
        if (cards.length === 0) {
          REMOVE_MARKER(this.NURSE_CALL_MARKER, player, this);
          return;
        }
        MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
        store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_HEAL,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false, blocked }
        ), results => {
          const targets: PokemonCardList[] = results || [];
          targets.forEach(target => {
            store.reduceEffect(state, new HealEffect(player, target, 20));
          });
        });
      });
    }

    // Return
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DRAW_CARDS_UNTIL_CARDS_IN_HAND(effect.player, 6);
    }

    // Double-edge
    if (WAS_ATTACK_USED(effect, 1, this)) {
      THIS_POKEMON_DOES_DAMAGE_TO_ITSELF(store, state, effect, 60);
    }

    if (effect instanceof EndTurnEffect) {
      REMOVE_MARKER(this.NURSE_CALL_MARKER, effect.player);
    }

    return state;
  }
}

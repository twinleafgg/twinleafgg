import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { StoreLike, State, GameMessage, PlayerType, SlotType, ChoosePokemonPrompt, PokemonCardList, GameError, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EffectOfAbilityEffect } from '../../../game/store/effects/game-effects';
import { PutCountersEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Giratina extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.PSYCHIC];
  public hp: number = 130;
  public weakness = [{ type: CardType.DARK }];
  public resistance = [{ type: CardType.FIGHTING, value: -20 }];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public powers = [{
    name: 'Distortion Door',
    useFromDiscard: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), if this Pokémon is in your discard pile, you may put it onto your Bench. If you do, put 1 damage counter on 2 of your opponent\'s Benched Pokémon.'
  }];

  public attacks = [{
    name: 'Shadow Impact',
    cost: [CardType.PSYCHIC, CardType.PSYCHIC, CardType.COLORLESS],
    damage: 130,
    text: 'Put 4 damage counters on 1 of your Pokémon. '
  }];

  public set: string = 'LOT';
  public setNumber: string = '97';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Giratina';
  public fullName: string = 'Giratina LOT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      //const opponent = StateUtils.getOpponent(state, player);
      const slots: PokemonCardList[] = player.bench.filter(b => b.cards.length === 0);

      // Check if card is in the discard
      if (!player.discard.cards.includes(this)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // No open slots, throw error
      if (slots.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      const opponent = StateUtils.getOpponent(state, player);
      const hasBench = opponent.bench.some(b => b.cards.length > 0);

      const cards = player.discard.cards.filter(c => c === this);
      cards.forEach(card => {
        MOVE_CARDS(store, state, player.discard, slots[0], { cards: [card], sourceCard: this }); // Move to Bench
      });

      if (!hasBench) {
        return state;
      }

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.BENCH],
        { min: 1, max: 2, allowCancel: false },
      ), selected => {
        const targets = selected || [];

        targets.forEach(target => {
          // Check if ability can target selected Pokemon
          const canApplyAbility = new EffectOfAbilityEffect(player, this.powers[0], this, target);
          store.reduceEffect(state, canApplyAbility);
          if (canApplyAbility.target) {
            canApplyAbility.target.damage += 10;
          }
        });

      });

    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const targets = selected || [];
        targets.forEach(target => {
          const putCountersEffect = new PutCountersEffect(effect, 40);
          putCountersEffect.target = target;
          store.reduceEffect(state, putCountersEffect);
        });
        return state;
      });

    }

    return state;
  }
}
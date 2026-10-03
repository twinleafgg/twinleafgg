import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt, GameMessage, PlayerType, PowerType, SlotType, StoreLike, State, StateUtils } from '../../../game';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, IS_ABILITY_BLOCKED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Zygarde extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 90;
  public weakness = [{ type: G }];
  public retreat = [C];

  public powers = [{
    name: 'Cellular Companions',
    powerType: PowerType.ABILITY,
    text: 'As long as this Pokémon is on your Bench, your Zygarde\'s and Zygarde-GX\'s attacks do 20 more damage to your opponent\'s Active Pokémon (before applying Weakness and Resistance).'
  }];

  public attacks = [
    {
      name: 'Boost Fang',
      cost: [F],
      damage: 20,
      text: 'Attach a [F] Energy card from your discard pile to 1 of your Benched Pokémon.'
    }
  ];

  public set: string = 'UNM';
  public setNumber: string = '124';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Zygarde';
  public fullName: string = 'Zygarde UNM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ability: Cellular Companions (passive - boost damage for Zygarde/Zygarde-GX)
    // Ref: set-team-up/tentacruel.ts (Paranormal - passive DealDamageEffect intercept)
    if (effect instanceof DealDamageEffect && effect.damage > 0) {
      const sourceCard = effect.source.getPokemonCard();
      if (!sourceCard) {
        return state;
      }

      // Check if the attacking Pokemon is a Zygarde or Zygarde-GX
      if (sourceCard.name !== 'Zygarde' && sourceCard.name !== 'Zygarde-GX') {
        return state;
      }

      // Check if the target is the opponent's active
      const sourcePlayer = StateUtils.findOwner(state, effect.source);
      const opponent = StateUtils.getOpponent(state, sourcePlayer);
      if (effect.target !== opponent.active) {
        return state;
      }

      // Check if this Zygarde is on the bench of the attacker's side
      let isOnBench = false;
      sourcePlayer.bench.forEach(b => {
        if (b.getPokemonCard() === this && b.cards.includes(this)) {
          isOnBench = true;
        }
      });

      if (!isOnBench) {
        return state;
      }

      if (IS_ABILITY_BLOCKED(store, state, sourcePlayer, this)) {
        return state;
      }

      effect.damage += 20;
    }

    // Attack 1: Boost Fang
    // Ref: set-unbroken-bonds/kyurem.ts (Call Forth Cold - attach energy from discard)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      const hasBench = player.bench.some(b => b.cards.length > 0);
      if (!hasBench) {
        return state;
      }

      state = store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_TO_BENCH,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fighting Energy' },
        { allowCancel: true, min: 0, max: 1 }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, EnergyType, Stage } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  GameMessage,
  PlayerType,
  ChooseCardsPrompt,
  CardTarget,
  SlotType,
  ChoosePokemonPrompt,
  PowerType,
  GameError,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PowerEffect } from '../../../game/store/effects/game-effects';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import {
  AttachEnergyEffect,
  AttachPokemonToolEffect,
  PlayStadiumEffect,
} from '../../../game/store/effects/play-card-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class HonchkrowGX extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Murkrow';
  protected _tags = [CardTag.POKEMON_GX];
  public cardType: CardType[] = [D];
  public hp: number = 210;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Ruler of the Night',
      powerType: PowerType.ABILITY,
      text: "As long as this Pokémon is your Active Pokémon, your opponent can't play any Pokémon Tool, Special Energy, or Stadium cards from their hand.",
    },
  ];

  public attacks = [
    {
      name: 'Feather Storm',
      cost: [D, C, C],
      damage: 90,
      text: "This attack does 30 damage to 2 of your opponent's Benched Pokémon-GX and Pokémon-EX. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
    {
      name: 'Unfair-GX',
      cost: [C, C],
      damage: 0,
      gxAttack: true,
      text: "Your opponent reveals their hand. Discard 2 cards from it. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public set: string = 'UNB';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '109';
  public name: string = 'Honchkrow-GX';
  public fullName: string = 'Honchkrow-GX UNB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ruler of the Night
    if (
      (effect instanceof AttachEnergyEffect &&
        effect.energyCard.energyType === EnergyType.SPECIAL) ||
      effect instanceof PlayStadiumEffect ||
      effect instanceof AttachPokemonToolEffect
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.active.getPokemonCard() !== this) {
        return state;
      }

      // Try to reduce PowerEffect, to check if something is blocking our ability
      try {
        const stub = new PowerEffect(
          effect.player,
          {
            name: 'test',
            powerType: PowerType.ABILITY,
            text: '',
          },
          this,
        );
        store.reduceEffect(state, stub);
      } catch {
        return state;
      }

      throw new GameError(GameMessage.BLOCKED_BY_ABILITY);
    }

    // Feather Storm
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasBenched = opponent.bench.some((b) => b.cards.length > 0);
      if (!hasBenched) {
        return state;
      }

      let gxsEXsOnBench = 0;
      const blockedTo: CardTarget[] = [];
      opponent.bench.forEach((bench, index) => {
        if (bench.cards.length === 0) {
          return;
        }

        if (
          bench.getPokemonCard()?.hasTag(CardTag.POKEMON_EX) ||
          bench.getPokemonCard()?.hasTag(CardTag.POKEMON_GX) ||
          bench.getPokemonCard()?.hasTag(CardTag.TAG_TEAM)
        ) {
          gxsEXsOnBench++;
        } else {
          const target: CardTarget = {
            player: PlayerType.BOTTOM_PLAYER,
            slot: SlotType.BENCH,
            index,
          };
          blockedTo.push(target);
        }
      });

      if (!gxsEXsOnBench) {
        return state;
      }

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          {
            min: Math.min(gxsEXsOnBench, 2),
            max: Math.min(gxsEXsOnBench, 2),
            allowCancel: false,
            blocked: blockedTo,
          },
        ),
        (targets) => {
          if (!targets || targets.length === 0) {
            return;
          }

          for (const target of targets) {
            const damageEffect = new PutDamageEffect(effect, 30);
            damageEffect.target = target;
            store.reduceEffect(state, damageEffect);
          }
        },
      );
    }

    // Unfair-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.usedGX) {
        throw new GameError(GameMessage.LABEL_GX_USED);
      }
      player.usedGX = true;

      if (opponent.hand.cards.length === 0) {
        return state;
      }

      state = store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          opponent.hand,
          {},
          {
            allowCancel: false,
            min: Math.min(opponent.hand.cards.length, 2),
            max: Math.min(opponent.hand.cards.length, 2),
          },
        ),
        (cards) => {
          cards = cards || [];

          MOVE_CARDS(store, state, opponent.hand, opponent.discard, { cards: cards, sourceCard: this });
        },
      );
    }

    return state;
  }
}

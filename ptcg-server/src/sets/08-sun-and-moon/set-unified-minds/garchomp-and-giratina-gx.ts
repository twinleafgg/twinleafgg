import {
  CardTag,
  CardType,
  ChoosePokemonPrompt,
  GameMessage,
  PlayerType,
  PokemonCard,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {BLOCK_IF_GX_ATTACK_USED,
  DAMAGE_OPPONENT_POKEMON,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class GarchompGiratinaGX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_GX, CardTag.TAG_TEAM];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.DRAGON];

  public hp: number = 270;

  public weakness = [{ type: CardType.FAIRY }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public set = 'UNM';

  public setNumber = '146';

  public cardImage = 'assets/cardback.png';

  public name = 'Garchomp & Giratina-GX';

  public fullName = 'Garchomp & Giratina-GX UNM';

  public attacks = [
    {
      name: 'Linear Attack',
      cost: [CardType.COLORLESS],
      damage: 0,
      text: "This attack does 40 damage to 1 of your opponent's Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
    {
      name: 'Calamitous Slash',
      cost: [CardType.PSYCHIC, CardType.FIGHTING, CardType.COLORLESS],
      damage: 160,
      text: "If your opponent's Active Pokémon already has any damage counters on it, this attack does 80 more damage.",
    },
    {
      name: 'GG End-GX',
      cost: [CardType.PSYCHIC, CardType.PSYCHIC, CardType.FIGHTING],
      damage: 0,
      text: "Discard 1 of your opponent's Pokémon and all cards attached to it. If this Pokémon has at least 3 extra [F] Energy attached to it (in addition to this attack's cost), discard 2 of your opponent's Pokémon instead. (You can't use more than 1 GX attack in a game.)",
    },
  ];

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Linear Attack
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { allowCancel: false },
        ),
        (selected) => {
          const targets = selected || [];
          DAMAGE_OPPONENT_POKEMON(store, state, effect, 40, targets);
        },
      );
    }

    // Calamitous Slash
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.active.damage > 0) {
        effect.damage += 80;
      }
    }

    // GG End-GX
    if (WAS_ATTACK_USED(effect, 2, this)) {
      const player = effect.player;
      const opponent = effect.opponent;

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      let amountToDiscard = 1;

      const extraEffectCost: CardType[] = [
        CardType.PSYCHIC,
        CardType.PSYCHIC,
        CardType.FIGHTING,
        CardType.FIGHTING,
        CardType.FIGHTING,
        CardType.FIGHTING,
      ];
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergy);
      const meetsExtraEffectCost = StateUtils.checkEnoughEnergy(
        checkProvidedEnergy.energyMap,
        extraEffectCost,
      );

      if (meetsExtraEffectCost) {
        const benched = opponent.bench.reduce((left, b) => left + (b.cards.length ? 1 : 0), 0);
        if (benched === 0) {
          return state;
        }

        amountToDiscard = Math.min(2, benched + 1);
      }

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_PICK_UP,
          PlayerType.TOP_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: amountToDiscard, max: amountToDiscard, allowCancel: false },
        ),
        (selection) => {
          selection.forEach((r) => {
            MOVE_CARDS(store, state, r, opponent.discard, { sourceCard: this });
            r.clearEffects();
          });
        },
      );
    }

    return state;
  }
}

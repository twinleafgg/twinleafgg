import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  EnergyType,
} from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  AttachEnergyPrompt,
  GameMessage,
  PlayerType,
  SlotType,
  StateUtils,
  ShuffleDeckPrompt,
  ChoosePokemonPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import {BLOCK_IF_GX_ATTACK_USED,
  SHUFFLE_DECK,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class PikachuZekromGX extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.TAG_TEAM, CardTag.POKEMON_GX];
  public cardType: CardType[] = [CardType.LIGHTNING];
  public hp: number = 240;
  public weakness = [{ type: CardType.FIGHTING }];
  public resistance = [{ type: CardType.METAL, value: -20 }];
  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Full Blitz',
      cost: [CardType.LIGHTNING, CardType.LIGHTNING, CardType.LIGHTNING],
      damage: 150,
      text: 'Search your deck for up to 3 [L] Energy cards and attach them to 1 of your Pokémon. Then, shuffle your deck.',
    },
    {
      name: 'Tag Bolt-GX',
      cost: [CardType.LIGHTNING, CardType.LIGHTNING, CardType.LIGHTNING],
      damage: 200,
      gxAttack: true,
      text:
        " If this Pokémon has at least 3 extra [L] Energy attached to it (in addition to this attack's cost)," +
        " this attack does 170 damage to 1 of your opponent's Benched Pokémon." +
        "(Don't apply Weakness and Resistance for Benched Pokémon.) (You can't use more than 1 GX attack in a game.) ",
    },
  ];

  public set: string = 'SMP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '168';
  public name: string = 'Pikachu & Zekrom-GX';
  public fullName: string = 'Pikachu & Zekrom GX SMP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      return store.prompt(
        state,
        new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.deck,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
          { allowCancel: true, min: 0, max: 3, sameTarget: true },
        ),
        (transfers) => {
          transfers = transfers || [];
          // cancelled by user
          if (transfers.length === 0) {
            SHUFFLE_DECK(store, state, player);
            return state;
          }
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
          }
          state = store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
            player.deck.applyOrder(order);
          });
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      const hasBenched = opponent.bench.some((b) => b.cards.length > 0);
      if (!hasBenched) {
        return state;
      }

      const checkProvidedEnergyEffect = new CheckProvidedEnergyEffect(player);
      store.reduceEffect(state, checkProvidedEnergyEffect);

      let energyCount = 0;
      checkProvidedEnergyEffect.energyMap.forEach((em) => {
        energyCount += em.provides.filter(
          (cardType) => cardType === CardType.LIGHTNING || cardType === CardType.ANY,
        ).length;
      });

      const extraLightningEnergy = energyCount - effect.attack.cost.length;

      if (extraLightningEnergy < 3) {
        return state;
      }

      if (extraLightningEnergy >= 3) {
        state = store.prompt(
          state,
          new ChoosePokemonPrompt(
            player.id,
            GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
            PlayerType.TOP_PLAYER,
            [SlotType.BENCH],
            { allowCancel: false },
          ),
          (targets) => {
            if (!targets || targets.length === 0) {
              return;
            }
            const damageEffect = new PutDamageEffect(effect, 170);
            damageEffect.target = targets[0];
            store.reduceEffect(state, damageEffect);
          },
        );

        return state;
      }
    }

    return state;
  }
}

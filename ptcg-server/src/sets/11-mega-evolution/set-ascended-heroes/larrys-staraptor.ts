import {
  PokemonCard,
  Stage,
  CardTag,
  CardType,
  StoreLike,
  State,
  SpecialCondition,
  StateUtils,
  SuperType,
  DiscardEnergyPrompt,
  GameMessage,
  PlayerType,
  SlotType,
  ChoosePokemonPrompt,
} from '../../../game';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class LarrysStaraptor extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = "Larry's Staravia";
  protected _tags = [CardTag.LARRYS];
  public cardType: CardType[] = [C];
  public hp: number = 150;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Facade',
      cost: [C],
      damage: 60,
      damageCalculation: '+',
      text: 'If this Pokémon is Burned or Poisoned, this attack does 100 more damage.',
    },
    {
      name: 'Feathery Strike',
      cost: [C, C, C],
      damage: 150,
      text: "Discard 2 Energy from this Pokémon, and this attack also does 50 damage to 1 of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public regulationMark = 'I';
  public set: string = 'ASC';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '170';
  public name: string = "Larry's Staraptor";
  public fullName: string = "Larry's Staraptor MC";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // First attack - bonus damage if Poisoned or Burned
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const isPoisoned = player.active.specialConditions.includes(SpecialCondition.POISONED);
      const isBurned = player.active.specialConditions.includes(SpecialCondition.BURNED);

      if (isPoisoned || isBurned) {
        effect.damage += 100;
      }
    }

    // Feather Strike attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Discard 2 Energy
      const energyCount = player.active.cards.filter(
        (card) => card.superType === SuperType.ENERGY,
      ).length;

      if (energyCount >= 2) {
        state = store.prompt(
          state,
          new DiscardEnergyPrompt(
            player.id,
            GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.ACTIVE],
            { superType: SuperType.ENERGY },
            { allowCancel: false, min: 2, max: 2 },
          ),
          (transfers) => {
            transfers = transfers || [];
            if (transfers.length > 0) {
              for (const transfer of transfers) {
                const source = StateUtils.getTarget(state, player, transfer.from);
                MOVE_CARDS(store, state, source, player.discard, { cards: [transfer.card], sourceCard: this });
              }
            }

            // Deal 50 damage to benched Pokemon
            if (opponent.bench.some((b) => b.cards.length > 0)) {
              return store.prompt(
                state,
                new ChoosePokemonPrompt(
                  player.id,
                  GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
                  PlayerType.TOP_PLAYER,
                  [SlotType.BENCH],
                  { allowCancel: false, min: 1, max: 1 },
                ),
                (targets) => {
                  targets = targets || [];
                  if (targets.length > 0) {
                    const dealDamage = new DealDamageEffect(effect, 50);
                    dealDamage.target = targets[0];
                    dealDamage.attackEffect.ignoreWeakness = true;
                    dealDamage.attackEffect.ignoreResistance = true;
                    return store.reduceEffect(state, dealDamage);
                  }
                },
              );
            }
          },
        );
      }
    }

    return state;
  }
}

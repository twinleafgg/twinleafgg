import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  StateUtils,
  GameMessage,
  ChoosePokemonPrompt,
  PlayerType,
  SlotType,
} from '../../../game';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { TrainerType } from '../../../game/store/card/card-types';
import { DealDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Hydreigon extends PokemonCard {
  protected _tags = [CardTag.TEAM_PLASMA];
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Zweilous';
  public cardType: CardType[] = [D];
  public hp: number = 150;
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [
    {
      name: 'Tractorbeam',
      cost: [D, C, C],
      damage: 0,
      text: "Switch 1 of your opponent's Benched Pokémon with the Defending Pokémon. This attack does 40 damage to the new Defending Pokémon.",
    },
    {
      name: 'Obsidian Fang',
      cost: [D, C, C, C],
      damage: 80,
      text: 'Before doing damage, discard all Pokémon Tool cards attached to the Defending Pokémon.',
    },
  ];

  public set: string = 'PLF';
  public setNumber: string = '78';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Hydreigon';
  public fullName: string = 'Hydreigon PLF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 1: Tractorbeam
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasBenched = opponent.bench.some((b) => b.cards.length > 0);

      if (!hasBenched) {
        // Just do 40 to active if no bench
        const dealDamage = new DealDamageEffect(effect, 40);
        dealDamage.target = opponent.active;
        store.reduceEffect(state, dealDamage);
        return state;
      }

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_SWITCH,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { allowCancel: false },
        ),
        (targets) => {
          if (!targets || targets.length === 0) {
            return;
          }

          // Switch the selected benched Pokemon with opponent's active
          opponent.switchPokemon(targets[0]);

          // Do 40 damage to the new active
          const dealDamage = new DealDamageEffect(effect, 40);
          dealDamage.target = opponent.active;
          store.reduceEffect(state, dealDamage);
        },
      );
    }

    // Attack 2: Obsidian Fang - discard all tools before doing damage
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Discard all Pokemon Tool cards from defending Pokemon
      const toolCards = opponent.active.cards.filter(
        (c) => c instanceof TrainerCard && c.trainerType === TrainerType.TOOL,
      );

      toolCards.forEach((tool) => {
        MOVE_CARDS(store, state, opponent.active, opponent.discard, { cards: [tool], sourceCard: this });
      });
    }

    return state;
  }
}

import {
  CardTag,
  CardType,
  PokemonCard,
  Stage,
  State,
  StoreLike,
  ShuffleDeckPrompt,
  ChoosePokemonPrompt,
  PlayerType,
  SlotType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';

import { GameMessage } from '../../../game/game-message';
import {DAMAGE_OPPONENT_POKEMON, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MegaSkarmoryex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SV_MEGA, CardTag.POKEMON_ex];
  public cardType: CardType[] = [M];
  public hp: number = 260;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [];

  public attacks = [
    {
      name: 'Sonic Ripper',
      cost: [M, M, C],
      damage: 0,
      text: "Shuffle all Energy from this Pokémon into your deck, and this attack does 220 damage to 1 of your opponent's Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public regulationMark: string = 'J';
  public set: string = 'POR';
  public setNumber: string = '55';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Mega Skarmory ex';
  public fullName: string = 'Mega Skarmory ex M3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Get all energy cards from this Pokemon
      const energyCards = [...player.active.energies.cards];

      // Move all energy cards to deck
      if (energyCards.length > 0) {
        MOVE_CARDS(store, state, player.active.energies, player.deck, { cards: energyCards, sourceCard: this });
      }

      // Shuffle the deck
      state = store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
        player.deck.applyOrder(order);
      });

      // Deal 220 damage to 1 of opponent's Pokemon
      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false },
        ),
        (selected) => {
          const targets = selected || [];
          DAMAGE_OPPONENT_POKEMON(store, state, effect, 220, targets);
        },
      );
    }
    return state;
  }
}

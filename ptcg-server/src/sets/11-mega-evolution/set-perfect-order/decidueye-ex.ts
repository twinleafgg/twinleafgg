import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameMessage,
  StateUtils,
  ChooseCardsPrompt,
  SuperType,
  PowerType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CheckAttackCostEffect } from '../../../game/store/effects/check-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {AFTER_ATTACK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Decidueyeex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Dartrix';
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [G];
  public hp: number = 320;
  public weakness = [{ type: R }];
  public retreat = [C, C];

  public powers = [
    {
      name: "Sniper's Eye",
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'If your opponent has exactly 4 cards in their hand, ignore all [C] Energy in the costs of attacks used by this Pokémon.',
    },
  ];

  public attacks = [
    {
      name: 'Crushing Arrow',
      cost: [G, C, C, C],
      damage: 240,
      text: "Discard an Energy from your opponent's Active Pokémon.",
    },
  ];

  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '12';
  public name: string = 'Decidueye ex';
  public fullName: string = 'Decidueye ex M3';

  public readonly SNIPER_EYE_MARKER = 'SNIPER_EYE_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ability: Ignore [C] in attack costs if opponent has exactly 4 cards
    if (effect instanceof CheckAttackCostEffect && effect.player.active.getPokemonCard() === this) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.hand.cards.length === 4) {
        // Remove all [C] from the cost
        const cost = effect.cost;
        while (cost.includes(CardType.COLORLESS)) {
          const index = cost.indexOf(CardType.COLORLESS);
          cost.splice(index, 1);
        }
      }
    }

    // Attack: Discard an Energy from opponent's Active Pokemon
    if (AFTER_ATTACK(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (opponent.active.energies.cards.length === 0) {
        return state;
      }

      const blocked: number[] = [];
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          opponent.active,
          { superType: SuperType.ENERGY },
          { min: 1, max: 1, allowCancel: false, blocked },
        ),
        (selected) => {
          const cards = selected || [];
          if (cards.length > 0) {
            MOVE_CARDS(store, state, opponent.active, opponent.discard, { cards: cards, sourceCard: this });
          }
        },
      );
    }

    if (
      effect instanceof EndTurnEffect &&
      effect.player.marker.hasMarker(this.SNIPER_EYE_MARKER, this)
    ) {
      effect.player.marker.removeMarker(this.SNIPER_EYE_MARKER, this);
    }

    return state;
  }
}

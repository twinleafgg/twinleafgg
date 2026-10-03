import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, GameMessage, ChooseCardsPrompt, EnergyCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, DISCARD_TOP_X_CARDS_FROM_YOUR_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Garchomp extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Gabite';
  public cardType: CardType[] = [N];
  public hp: number = 140;
  public weakness = [{ type: N }];
  public retreat = [C];

  public attacks = [
    {
      name: 'Mach Cut',
      cost: [F],
      damage: 60,
      text: 'Discard a Special Energy attached to the Defending Pokémon.'
    },
    {
      name: 'Dragonblade',
      cost: [W, F],
      damage: 100,
      text: 'Discard the top 2 cards of your deck.'
    }
  ];

  public set: string = 'PLF';
  public setNumber: string = '120';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Garchomp';
  public fullName: string = 'Garchomp PLF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Attack 1: Mach Cut - discard a Special Energy from defending
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Check if defending has special energy
      const hasSpecialEnergy = opponent.active.cards.some(c =>
        c.superType === SuperType.ENERGY && (c as EnergyCard).energyType === EnergyType.SPECIAL
      );

      if (hasSpecialEnergy) {
        // Build blocked list for non-special energy cards
        const blocked: number[] = [];
        opponent.active.cards.forEach((c, index) => {
          if (c.superType !== SuperType.ENERGY || (c as EnergyCard).energyType !== EnergyType.SPECIAL) {
            blocked.push(index);
          }
        });

        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          opponent.active,
          { superType: SuperType.ENERGY },
          { min: 1, max: 1, allowCancel: false, blocked }
        ), selected => {
          if (selected && selected.length > 0) {
            MOVE_CARDS(store, state, opponent.active, opponent.discard, { cards: [selected[0]], sourceCard: this });
          }
        });
      }
    }

    // Attack 2: Dragonblade - discard top 2 cards of your deck
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      DISCARD_TOP_X_CARDS_FROM_YOUR_DECK(store, state, player, 2, this, effect);
    }

    return state;
  }
}

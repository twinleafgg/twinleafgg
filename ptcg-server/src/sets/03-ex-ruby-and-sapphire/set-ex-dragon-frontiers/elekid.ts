import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  Card,
  ChooseCardsPrompt,
  GameMessage,
  PowerType,
  GameError,
  PokemonCardList,
  StateUtils,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';

export class Elekid extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.DELTA_SPECIES];
  public cardType: CardType[] = [F];
  public hp: number = 40;
  public weakness = [{ type: F }];
  public retreat = [C];

  public powers = [
    {
      name: 'Baby Evolution',
      powerType: PowerType.POKEPOWER,
      useWhenInPlay: true,
      text: 'Once during your turn (before your attack), you may put Electabuzz from your hand onto Elekid (this counts as evolving Elekid) and remove all damage counters from Elekid.',
    },
  ];

  public attacks = [
    {
      name: 'Thunder Spear',
      cost: [C],
      damage: 0,
      text: "Choose 1 of your opponent's Pokémon. This attack does 10 damage to that Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public set: string = 'DF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '48';
  public name: string = 'Elekid';
  public fullName: string = 'Elekid DF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const hasElectabuzz = player.hand.cards.some(
        (card) => card instanceof PokemonCard && card.name === 'Electabuzz',
      );

      // Check if Electabuzz is in the player's hand
      if (!hasElectabuzz) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Blocking pokemon cards, that cannot be valid evolutions
      const blocked: number[] = [];
      player.hand.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.name !== 'Electabuzz') {
          blocked.push(index);
        }
      });

      let selectedCards: Card[] = [];
      store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_EVOLVE,
          player.hand,
          { superType: SuperType.POKEMON },
          { min: 1, max: 1, allowCancel: true, blocked },
        ),
        (selected) => {
          selectedCards = selected || [];

          const evolution = selectedCards[0] as PokemonCard;

          const target = StateUtils.findCardList(state, this);

          // Evolve Pokemon
          MOVE_CARDS(store, state, player.hand, target, { cards: [evolution], sourceCard: this });
          const pokemonTarget = target as PokemonCardList;
          pokemonTarget.clearEffects();
          pokemonTarget.pokemonPlayedTurn = state.turn;

          // Heal all damage from the evolved Pokemon
          const healEffect = new HealEffect(player, pokemonTarget, pokemonTarget.damage);
          store.reduceEffect(state, healEffect);

          return state;
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(10, effect, store, state);
    }

    return state;
  }
}

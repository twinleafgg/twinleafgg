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
  ChoosePokemonPrompt,
  PlayerType,
  SlotType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { HealEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PutCountersEffect } from '../../../game/store/effects/attack-effects';

export class Smoochum extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.DELTA_SPECIES];
  public cardType: CardType[] = [W];
  public hp: number = 50;
  public weakness = [{ type: M }];
  public retreat = [C];

  public powers = [
    {
      name: 'Baby Evolution',
      powerType: PowerType.POKEPOWER,
      useWhenInPlay: true,
      text: 'Once during your turn (before your attack), you may put Jynx from your hand onto Smoochum (this counts as evolving Smoochum) and remove all damage counters from Smoochum.',
    },
  ];

  public attacks = [
    {
      name: 'Blown Kiss',
      cost: [C],
      damage: 0,
      text: "Put 1 damage counter on 1 of your opponent's Pokémon.",
    },
  ];

  public set: string = 'UF';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '31';
  public name: string = 'Smoochum';
  public fullName: string = 'Smoochum UF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const hasJynx = player.hand.cards.some(
        (card) => card instanceof PokemonCard && card.name === 'Jynx',
      );

      // Check if Jynx is in the player's hand
      if (!hasJynx) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Blocking pokemon cards, that cannot be valid evolutions
      const blocked: number[] = [];
      player.hand.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.name !== 'Jynx') {
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
      const player = effect.player;

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
          targets.forEach((target) => {
            const damageEffect = new PutCountersEffect(effect, 10);
            damageEffect.target = target;
            store.reduceEffect(state, damageEffect);
          });
          return state;
        },
      );
    }

    return state;
  }
}

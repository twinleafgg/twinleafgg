import { PowerEffect } from '../../../game/store/effects/game-effects';
import { Effect } from '../../../game/store/effects/effect';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  TrainerType,
  SpecialCondition,
} from '../../../game/store/card/card-types';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {
  PowerType,
  StoreLike,
  State,
  GameMessage,
  ChooseCardsPrompt,
  ShuffleDeckPrompt,
} from '../../../game';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

function* useStellarGuidance(
  next: Function,
  store: StoreLike,
  state: State,
  self: JirachiEX,
  effect: PlayPokemonEffect,
): IterableIterator<State> {
  const player = effect.player;

  if (player.deck.cards.length === 0) {
    return state;
  }

  // Try to reduce PowerEffect, to check if something is blocking our ability
  try {
    const stub = new PowerEffect(
      player,
      {
        name: 'test',
        powerType: PowerType.ABILITY,
        text: '',
      },
      self,
    );
    store.reduceEffect(state, stub);
  } catch {
    return state;
  }

  yield store.prompt(
    state,
    new ChooseCardsPrompt(
      player,
      GameMessage.CHOOSE_CARD_TO_HAND,
      player.deck,
      { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
      { min: 1, max: 1, allowCancel: true },
    ),
    (selected) => {
      const cards = selected || [];
      MOVE_CARDS(store, state, player.deck, player.hand, { cards: cards, sourceCard: self });
      next();
    },
  );

  return store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
    player.deck.applyOrder(order);
  });
}

export class JirachiEX extends PokemonCard {
  protected _tags = [CardTag.POKEMON_EX];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.METAL];

  public hp: number = 90;

  public weakness = [{ type: CardType.FIRE }];

  public resistance = [{ type: CardType.PSYCHIC, value: -20 }];

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Stellar Guidance',
      powerType: PowerType.ABILITY,
      text:
        'When you play this Pokemon from your hand onto your Bench, ' +
        'you may search your deck for a Supporter card, reveal it, and put it ' +
        'into your hand. Shuffle your deck afterward.',
    },
  ];

  public attacks = [
    {
      name: 'Hypnostrike',
      cost: [CardType.METAL, CardType.COLORLESS, CardType.COLORLESS],
      damage: 60,
      text: 'Both this Pokemon and the Defending Pokemon are now Asleep.',
    },
  ];

  public set: string = 'PLB';

  public name: string = 'Jirachi-EX';

  public fullName: string = 'Jirachi EX PLB';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '60';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const generator = useStellarGuidance(() => generator.next(), store, state, this, effect);
      return generator.next().value;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const asleepEffect = new AddSpecialConditionsEffect(effect, [SpecialCondition.ASLEEP]);
      asleepEffect.target = player.active;
      store.reduceEffect(state, asleepEffect);

      const asleepEffect2 = new AddSpecialConditionsEffect(effect, [SpecialCondition.ASLEEP]);
      store.reduceEffect(state, asleepEffect2);
    }

    return state;
  }
}

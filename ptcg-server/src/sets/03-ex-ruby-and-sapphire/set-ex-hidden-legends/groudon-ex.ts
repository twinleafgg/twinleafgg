import {
  PokemonCard,
  Stage,
  CardType,
  PowerType,
  StoreLike,
  State,
  CardTag,
  GameError,
  GameMessage,
  SuperType,
  ChooseCardsPrompt,
} from '../../../game';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Groudonex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [F];
  public hp: number = 100;
  public weakness = [{ type: W }];
  public retreat = [C, C, C];

  public powers = [
    {
      name: 'Mark of Antiquity',
      powerType: PowerType.POKEBODY,
      text: "As long as Groudon ex is your Active Pokémon, each player's Kyogre ex and Rayquaza ex can't attack.",
    },
  ];

  public attacks = [
    {
      name: 'Rock Tumble',
      cost: [C, C],
      damage: 30,
      text: "This attack's damage is not affected by Resistance.",
    },
    {
      name: 'Crushing Mantle',
      cost: [F, F, C],
      damage: 50,
      damageCalculation: '+',
      text: 'You may discard from your hand as many Energy cards as you like. If you do, this attack does 50 damage plus 10 more damage for each Energy card you discarded.',
    },
  ];

  public set: string = 'HL';
  public setNumber: string = '93';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Groudon ex';
  public fullName: string = 'Groudon ex HL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof AttackEffect &&
      (effect.source.getPokemonCard()?.name === 'Kyogre ex' ||
        effect.source.getPokemonCard()?.name === 'Rayquaza ex')
    ) {
      if (effect.opponent.active.getPokemonCard() === this) {
        throw new GameError(GameMessage.CANNOT_USE_ATTACK);
      }
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.ignoreResistance = true;
    }

    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const energiesInHand = player.hand.cards.filter(
        (card) => card.superType === SuperType.ENERGY,
      );

      // Prompt player to choose cards to discard
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.hand,
          { superType: SuperType.ENERGY },
          { allowCancel: false, min: 0, max: energiesInHand.length },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length === 0) {
            return;
          }
          const discardEnergy = new DiscardCardsEffect(effect, cards);
          discardEnergy.target = player.active;
          store.reduceEffect(state, discardEnergy);
          MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });

          effect.damage += cards.length * 10;
          return state;
        },
      );
    }

    return state;
  }
}

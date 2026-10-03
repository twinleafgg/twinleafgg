import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  CardTag,
  SuperType,
  TrainerType,
} from '../../../game/store/card/card-types';
import { StoreLike, State, ChooseCardsPrompt, PowerType, GameError } from '../../../game';

import { Effect } from '../../../game/store/effects/effect';
import { GameMessage } from '../../../game/game-message';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class RotomV extends PokemonCard {
  public regulationMark = 'F';

  protected _tags = [CardTag.POKEMON_V];

  public stage: Stage = Stage.BASIC;

  public cardType: CardType[] = [CardType.LIGHTNING];

  public hp: number = 190;

  public weakness = [{ type: CardType.FIGHTING }];

  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Instant Charge',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: 'Once during your turn, you may draw 3 cards. If you use this Ability, your turn ends.',
    },
  ];

  public attacks = [
    {
      name: 'Scrap Short',
      cost: [CardType.LIGHTNING, CardType.LIGHTNING],
      damage: 40,
      damageCalculation: '+',
      text: 'Put any number of Pokémon Tool cards from your discard pile in the Lost Zone. This attack does 40 more damage for each card you put in the Lost Zone in this way.',
    },
  ];

  public set: string = 'LOR';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '58';

  public name: string = 'Rotom V';

  public fullName: string = 'Rotom V LOR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      // Prompt player to choose tools to send to lost zone
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_DISCARD,
          player.discard,
          { superType: SuperType.TRAINER, trainerType: TrainerType.TOOL },
          { allowCancel: false, min: 0 },
        ),
        (cards) => {
          cards = cards || [];
          if (cards.length === 0) {
            return;
          }
          const discountTools = new DiscardCardsEffect(effect, cards);
          discountTools.target = player.active;
          store.reduceEffect(state, discountTools);
          MOVE_CARDS(store, state, player.discard, player.lostzone, { cards: cards, sourceCard: this });

          // Calculate damage
          const damage = cards.length * 40;
          effect.damage = damage;
          return state;
        },
      );
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      MOVE_CARDS(store, state, player.deck, player.hand, { count: 3, sourceCard: this });
      const endTurnEffect = new EndTurnEffect(player);
      store.reduceEffect(state, endTurnEffect);
      return state;
    }
    return state;
  }
}

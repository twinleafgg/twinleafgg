import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { PowerType } from '../../../game/store/card/pokemon-types';
import { StoreLike, State, Card, ChooseCardsPrompt, GameMessage, TrainerCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EvolveEffect } from '../../../game/store/effects/game-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Herdier extends PokemonCard {
  public cardType: CardType[] = [CardType.COLORLESS];
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Lillipup';
  public hp: number = 90;
  public retreat = [CardType.COLORLESS];
  public weakness = [{ type: CardType.FIGHTING }];

  public powers = [{
    name: 'Treasure Hunt',
    powerType: PowerType.ABILITY,
    text: 'When you play this Pokémon from your hand to evolve 1 of your Pokémon during your turn, you may put an Item card from your discard pile into your hand.',
  },
  ];
  public attacks = [
    {
      name: 'Bite',
      cost: [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS],
      damage: 50,
      text: '',
    },
  ];

  public set = 'SUM'; // Replace with the appropriate set abbreviation
  public name = 'Herdier';
  public fullName = 'Herdier SUM'; // Replace with the appropriate set abbreviation
  public setNumber = '104';
  public cardImage: string = 'assets/cardback.png';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (effect instanceof EvolveEffect && effect.pokemonCard === this) {
      const player = effect.player;

      const hasItem = player.discard.cards.some(c => {
        return c instanceof TrainerCard && c.trainerType === TrainerType.ITEM;
      });

      if (!hasItem) {
        return state;
      }

      let cards: Card[] = [];
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.discard,
        { superType: SuperType.TRAINER, trainerType: TrainerType.ITEM },
        { min: 1, max: 2, allowCancel: true }
      ), selected => {
        cards = selected || [];

        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.discard, player.hand, { cards: cards, sourceCard: this });
        }
      });
    }
    return state;
  }
}
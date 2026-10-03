import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, CardTag, SuperType } from '../../../game/store/card/card-types';
import { StoreLike,
  State,
  StateUtils,
  GameMessage,
  PowerType,
  Card,
  ChooseCardsPrompt,
  GameError,
  ShowCardsPrompt,
  pokemonHasCardType,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { COPY_ATTACK_FROM_POKEMON_LIST } from '../../../game/store/prefabs/copy-attack-prefabs';

export class RegidragoVSTAR extends PokemonCard {
  protected _tags = [CardTag.POKEMON_VSTAR];

  public regulationMark = 'F';

  public stage: Stage = Stage.VSTAR;

  public evolvesFrom = 'Regidrago V';

  public cardType: CardType[] = [CardType.DRAGON];

  public hp: number = 280;

  public weakness = [];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS, CardType.COLORLESS];

  public attacks = [
    {
      name: 'Apex Dragon',
      cost: [CardType.GRASS, CardType.GRASS, CardType.FIRE],
      damage: 0,
      copycatAttack: true,
      text: 'Choose an attack from a [N] Pokémon in your discard pile and use it as this attack.',
    },
  ];

  public powers = [
    {
      name: 'Legacy Star',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: "During your turn, you may discard the top 7 cards of your deck. Then, put up to 2 cards from your discard pile into your hand. (You can't use more than 1 VSTAR Power in a game.)",
    },
  ];

  public set: string = 'SIT';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '136';

  public name: string = 'Regidrago VSTAR';

  public fullName: string = 'Regidrago VSTAR SIT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const discardPokemon = player.discard.cards.filter(
        (card) => card.superType === SuperType.POKEMON,
      ) as PokemonCard[];
      const dragonTypePokemon = discardPokemon.filter(
        (card) => pokemonHasCardType(card, CardType.DRAGON) && card.name !== 'Regidrago VSTAR',
      );

      if (dragonTypePokemon.length === 0) {
        return state;
      }

      return COPY_ATTACK_FROM_POKEMON_LIST(store, state, effect as AttackEffect, dragonTypePokemon, {
        allowCancel: true,
        maxRetries: 3,
      });
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.usedVSTAR === true) {
        throw new GameError(GameMessage.LABEL_VSTAR_USED);
      }

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      player.usedVSTAR = true;

      MOVE_CARDS(store, state, player.deck, player.discard, { count: 7, sourceCard: this });

      let cards: Card[] = [];
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_HAND,
          player.discard,
          {},
          { min: 1, max: 2, allowCancel: false },
        ),
        (selected) => {
          cards = selected || [];

          cards.forEach((card, index) => {
            MOVE_CARDS(store, state, player.discard, player.hand, { cards: [card], sourceCard: this });
          });

          if (cards.length > 0) {
            state = store.prompt(
              state,
              new ShowCardsPrompt(opponent.id, GameMessage.CARDS_SHOWED_BY_THE_OPPONENT, cards),
              () => {},
            );
          }
        },
      );
    }
    return state;
  }
}

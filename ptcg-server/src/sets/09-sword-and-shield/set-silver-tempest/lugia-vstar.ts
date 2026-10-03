import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, CardTag } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  ChooseCardsPrompt,
  PokemonCardList,
  Card,
  StateUtils,
  GameMessage,
  PowerType,
  GameError,
  ConfirmPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class LugiaVSTAR extends PokemonCard {
  protected _tags = [CardTag.POKEMON_VSTAR];
  public regulationMark = 'F';
  public stage: Stage = Stage.VSTAR;
  public evolvesFrom = 'Lugia V';
  public cardType: CardType[] = [C];
  public hp: number = 280;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Summoning Star',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: "During your turn, you may put up to 2 [C] Pokémon that don't have a Rule Box from your discard pile onto your Bench. (Pokémon V, Pokémon-GX, etc. have Rule Boxes.) (You can't use more than 1 VSTAR Power in a game.)",
    },
  ];

  public attacks = [
    {
      name: 'Tempest Dive',
      cost: [C, C, C, C],
      damage: 220,
      text: 'You may discard a Stadium in play.',
    },
  ];

  public set: string = 'SIT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '139';
  public name: string = 'Lugia VSTAR';
  public fullName: string = 'Lugia VSTAR SIT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter((b) => b.cards.length === 0);
      const max = Math.min(slots.length, 2);

      if (player.usedVSTAR === true) {
        throw new GameError(GameMessage.LABEL_VSTAR_USED);
      }

      const blocked: number[] = [];
      player.discard.cards.forEach((card, index) => {
        if (card instanceof PokemonCard && card.hasRuleBox()) {
          blocked.push(index);
        }
      });

      player.usedVSTAR = true;
      let cards: Card[] = [];
      return store.prompt(
        state,
        new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
          player.discard,
          { superType: SuperType.POKEMON, cardType: [CardType.COLORLESS] },
          { min: 1, max, allowCancel: true, blocked },
        ),
        (selected) => {
          cards = selected || [];

          cards.forEach((card, index) => {
            MOVE_CARDS(store, state, player.discard, slots[index], { cards: [card], sourceCard: this });
            slots[index].pokemonPlayedTurn = state.turn;
          });
          return state;
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (stadiumCard !== undefined) {
        state = store.prompt(
          state,
          new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_DISCARD_STADIUM),
          (wantToUse) => {
            if (wantToUse) {
              // Discard Stadium
              const cardList = StateUtils.findCardList(state, stadiumCard);
              const player = StateUtils.findOwner(state, cardList);
              MOVE_CARDS(store, state, cardList, player.discard, { sourceCard: this });
              return state;
            }
            return state;
          },
        );
      }
      return state;
    }
    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, TrainerType } from '../../../game/store/card/card-types';
import {
  StoreLike,
  State,
  GameMessage,
  PowerType,
  ChooseCardsPrompt,
  PlayerType,
  StateUtils,
  GameError,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ABILITY_USED, MOVE_CARDS, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';
import { Card } from '../../../game';

export class Magneton extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Magnemite';
  public cardType: CardType[] = [L];
  public hp: number = 80;
  public weakness = [{ type: F }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Call Signal',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    knocksOutSelf: true,
    text: 'Once during your turn (before your attack), you may search your deck for up to 3 Supporter cards, reveal them, and put them into your hand. Then, shuffle your deck. If you searched your deck in this way, this Pokémon is Knocked Out.'
  }];

  public attacks = [{
    name: 'Magnetic Blast',
    cost: [L, L, C],
    damage: 50,
    text: ''
  }];

  public set: string = 'CEC';
  public setNumber: string = '69';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Magneton';
  public fullName: string = 'Magneton CEC';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (player.deck.cards.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      ABILITY_USED(player, this);

      let cards: Card[] = [];
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.TRAINER, trainerType: TrainerType.SUPPORTER },
        { min: 0, max: 3, allowCancel: true }
      ), selectedCards => {
        cards = selectedCards || [];

        // Operation canceled by the user
        if (cards.length === 0) {
          SHUFFLE_DECK(store, state, player);
          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
            if (cardList.getPokemonCard() === this) {
              cardList.damage += 999;
            }
          });
          return state;
        }

        cards.forEach((card, index) => {
          MOVE_CARDS(store, state, player.deck, player.hand, { cards: [card], sourceCard: this, sourceEffect: this.powers[0] });
        });

        SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
        SHUFFLE_DECK(store, state, player);

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            cardList.damage += 999;
          }
        });
      });
    }
    return state;
  }
}
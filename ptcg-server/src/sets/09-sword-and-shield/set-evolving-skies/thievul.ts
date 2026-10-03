import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, PowerType, CardList, Player, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CONFIRMATION_PROMPT, DRAW_CARDS, JUST_EVOLVED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Thievul extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom = 'Nickit';
  public cardType: CardType[] = [D];
  public hp: number = 100;
  public weakness = [{ type: G }];
  public retreat = [C];

  public powers = [{
    name: 'Fumbling Hands',
    powerType: PowerType.ABILITY,
    text: 'When you play this Pokémon from your hand to evolve 1 of your Pokémon during your turn, you may have each player shuffle their hand and put it on the bottom of their deck. If either player put any cards on the bottom of their deck in this way, each player draws 4 cards.'
  }];

  public attacks = [{
    name: 'Tail Smack',
    cost: [C, C],
    damage: 60,
    text: ''
  }];

  public set = 'EVS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '105';
  public name = 'Thievul';
  public fullName = 'Thievul EVS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (JUST_EVOLVED(effect, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const deckBottom = new CardList();
      const opponentDeckBottom = new CardList();

      if (player.hand.cards.length === 0 && opponent.hand.cards.length === 0) {
        return state;
      }

      CONFIRMATION_PROMPT(store, state, player, result => {
        if (result) {
          this.shufflePlayerHand(player);
          this.shufflePlayerHand(opponent);

          MOVE_CARDS(store, state, player.hand, deckBottom, { sourceCard: this, sourceEffect: this.powers[0] });
          MOVE_CARDS(store, state, opponent.hand, opponentDeckBottom, { sourceCard: this, sourceEffect: this.powers[0] });

          MOVE_CARDS(store, state, deckBottom, player.deck, { sourceCard: this });
          MOVE_CARDS(store, state, opponentDeckBottom, opponent.deck, { sourceCard: this });

          DRAW_CARDS(store, state, player, 4);
          DRAW_CARDS(store, state, opponent, 4);
        }
      }, GameMessage.WANT_TO_USE_ABILITY);
    }

    return state;
  }

  shufflePlayerHand(player: Player): void {
    const hand = player.hand.cards;

    // Shuffle the hand using the Fisher-Yates shuffle algorithm
    for (let i = hand.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [hand[i], hand[j]] = [hand[j], hand[i]];
    }
  }

}
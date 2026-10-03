import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { GameError, GameMessage, PowerType, StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {WAS_POWER_USED, IS_ABILITY_BLOCKED, USE_ABILITY_ONCE_PER_TURN, ABILITY_USED, COIN_FLIP_PROMPT, REMOVE_MARKER_AT_END_OF_TURN, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Wynaut extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 60;
  public retreat = [];

  public readonly PEPPY_PICK_MARKER = 'WYNAUT_UNM_PEPPY_PICK_MARKER';

  public powers = [{
    name: 'Peppy Pick',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may flip a coin. If heads, choose a random card from your opponent\'s hand. Your opponent reveals that card and shuffles it into their deck. If you use this Ability, your turn ends.'
  }];

  public set: string = 'UNM';
  public setNumber: string = '77';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Wynaut';
  public fullName: string = 'Wynaut UNM';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ability: Peppy Pick
    // Refs: set-unbroken-bonds/happiny.ts (Playhouse Heal - once per turn + turn ends), set-unbroken-bonds/purugly.ts (random card from hand)
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.PEPPY_PICK_MARKER, this);
      ABILITY_USED(player, this);

      const opponent = StateUtils.getOpponent(state, player);

      COIN_FLIP_PROMPT(store, state, player, result => {
        if (result && opponent.hand.cards.length > 0) {
          // Choose a random card from opponent's hand and shuffle into deck
          const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
          const randomCard = opponent.hand.cards[randomIndex];
          MOVE_CARDS(store, state, opponent.hand, opponent.deck, { cards: [randomCard], sourceCard: this });
          SHUFFLE_DECK(store, state, opponent);
        }
        // Turn ends regardless
        const endTurnEffect = new EndTurnEffect(player);
        store.reduceEffect(state, endTurnEffect);
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.PEPPY_PICK_MARKER, this);

    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, BoardEffect } from '../../../game/store/card/card-types';
import {
  PowerType, StoreLike, State, GameError, GameMessage,
  PlayerType, SlotType,
  ChoosePokemonPrompt,
  CardTarget,
  StateUtils,
  CardList
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import {REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ADD_MARKER, REMOVE_MARKER, HAS_MARKER } from '../../../game/store/prefabs/prefabs';

export class UnownP extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public evolvesFrom = 'Unown P';
  public cardType: CardType[] = [P];
  public hp: number = 50;
  public weakness = [{ type: P, value: +10 }];
  public retreat = [C];

  public powers = [{
    name: 'PUT',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), if Unown P is on your Bench, you may put 1 damage counter on 1 of your Pokémon (excluding any Unown).'
  }];

  public attacks = [
    {
      name: 'Hidden Power',
      cost: [P],
      damage: 20,
      damageCalculation: '+',
      text: 'Each player discards the top card of his or her deck. This attack does 20 damage plus 20 more damage for each Unown discarded in this way.'
    },
  ];

  public set: string = 'MD';
  public name: string = 'Unown P';
  public fullName: string = 'Unown P MD';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '33';

  public readonly PUT_MARKER = 'PUT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      REMOVE_MARKER(this.PUT_MARKER, effect.player, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      // Ensure the Pokémon is on the bench
      const isOnBench = player.bench.some(cardList => cardList.getPokemonCard() === this);
      if (!isOnBench) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      // Once per turn
      if (HAS_MARKER(this.PUT_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      const blocked: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, card, target) => {
        if (card.name.includes('Unown')) {
          blocked.push(target);
        }
      });

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH, SlotType.ACTIVE],
        { allowCancel: false, blocked }
      ), targets => {
        if (!targets || targets.length === 0) {
          return;
        }

        ADD_MARKER(this.PUT_MARKER, player, this);

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
          }
        });

        targets.forEach(target => {
          target.damage += 10;
        });
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const playerTopDeck = new CardList();
      const opponentTopDeck = new CardList();
      let damageScaling = 0;

      MOVE_CARDS(store, state, player.deck, playerTopDeck, { count: 1, sourceCard: this });
      MOVE_CARDS(store, state, opponent.deck, opponentTopDeck, { count: 1, sourceCard: this });

      if (playerTopDeck.cards[0] instanceof PokemonCard && playerTopDeck.cards[0].name.includes('Unown')) {
        damageScaling++;
      }
      if (opponentTopDeck.cards[0] instanceof PokemonCard && opponentTopDeck.cards[0].name.includes('Unown')) {
        damageScaling++;
      }

      effect.damage += (20 * damageScaling);

      MOVE_CARDS(store, state, playerTopDeck, player.discard, { sourceCard: this });
      MOVE_CARDS(store, state, opponentTopDeck, opponent.discard, { sourceCard: this });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.PUT_MARKER, this);

    return state;
  }
}

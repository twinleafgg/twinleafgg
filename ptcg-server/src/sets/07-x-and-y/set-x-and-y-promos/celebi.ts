import { GameLog, PowerType, ShuffleDeckPrompt, State, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { KnockOutEffect } from '../../../game/store/effects/game-effects';
import { CoinFlipEffect } from '../../../game/store/effects/play-card-effects';
import { PUT_X_DAMAGE_COUNTERS_ON_ALL_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { IS_ABILITY_BLOCKED, MOVE_POKEMON_OFF_BOARD, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Celebi extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [CardType.GRASS];
  public hp: number = 70;
  public weakness = [{ type: CardType.FIRE }];
  public retreat = [CardType.COLORLESS];

  public powers = [{
    name: 'θ Stop',
    text: 'Prevent all effects of your opponent\'s Pokémon\'s Abilities done to this Pokémon.',
    powerType: PowerType.ANCIENT_TRAIT,
    useWhenInPlay: false,
  },
  {
    name: 'Leap Through Time',
    text: 'When this Pokémon is Knocked Out, flip a coin. If heads, your opponent can\'t take a Prize card. Shuffle this Pokémon and all cards attached to it into your deck.',
    powerType: PowerType.ABILITY,
    useWhenInPlay: false,
  }];

  public attacks = [{
    name: 'Sparkle Motion',
    cost: [CardType.GRASS],
    damage: 0,
    text: 'Put 1 damage counter on each of your opponent\'s Pokémon.'
  }];

  public set: string = 'XYP';
  public setNumber: string = '93';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Celebi';
  public fullName: string = 'Celebi XYP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof KnockOutEffect && effect.target.cards.includes(this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const coinFlip = new CoinFlipEffect(player);
      store.reduceEffect(state, coinFlip);

      if (coinFlip.result === false) {
        return state;
      }

      effect.prizeCount = 0;

      const cardList = effect.target;
      MOVE_POKEMON_OFF_BOARD(store, state, cardList, {
        pokemonDestination: player.deck,
        sourceCard: this,
      });

      store.log(state, GameLog.LOG_SHUFFLE_POKEMON_INTO_DECK, { name: player.name, card: this.name, effect: this.powers[0].name });

      return store.prompt(state, new ShuffleDeckPrompt(player.id), order => {
        player.deck.applyOrder(order);
      });
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      PUT_X_DAMAGE_COUNTERS_ON_ALL_YOUR_OPPONENTS_POKEMON(1, store, state, effect);
    }

    return state;
  }
}
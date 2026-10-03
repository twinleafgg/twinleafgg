import {
  ChoosePokemonPrompt,
  GameError,
  PlayerType,
  PokemonCardList,
  PowerType,
  SlotType,
  State,
  StateUtils,
  StoreLike,
} from '../../../game';
import { GameMessage } from '../../../game/game-message';
import { CardTag, CardType, Stage } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_POKEMON_OFF_BOARD, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';
import { DEFENDING_POKEMON_CANNOT_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class IronBundle extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.FUTURE];
  public cardType: CardType[] = [CardType.WATER];
  public hp: number = 100;
  public weakness = [{ type: CardType.LIGHTNING }];
  public retreat = [CardType.COLORLESS];

  public powers = [
    {
      name: 'Hyper Blower',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text: "Once during your turn, if this Pokémon is on your Bench, you may switch out your opponent's Active Pokémon to the Bench. (Your opponent chooses the new Active Pokémon.) If you do, discard this Pokémon and all attached cards.",
    },
  ];

  public attacks = [
    {
      name: 'Refrigerated Stream',
      cost: [CardType.WATER, CardType.COLORLESS, CardType.COLORLESS],
      damage: 80,
      text: "If the Defending Pokémon is an Evolution Pokémon, it can't attack during your opponent's next turn.",
    },
  ];

  public set: string = 'PAR';
  public regulationMark = 'G';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '56';
  public name: string = 'Iron Bundle';
  public fullName: string = 'Iron Bundle PAR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const cardList = StateUtils.findCardList(state, this);

      if (player.active.cards[0] === this) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const benchIndex = player.bench.indexOf(cardList as PokemonCardList);
      if (benchIndex === -1) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      if (!opponent.bench.some((b) => b.cards.length > 0)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          opponent.id,
          GameMessage.CHOOSE_POKEMON_TO_SWITCH,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { allowCancel: false },
        ),
        (targets) => {
          if (targets && targets.length > 0) {
            opponent.active.clearEffects();
            opponent.switchPokemon(targets[0]);
            MOVE_POKEMON_OFF_BOARD(store, state, player.bench[benchIndex], {
              pokemonDestination: player.discard,
              sourceCard: this,
            });
          }
        },
      );
    }

    // Refrigerated Stream
    // Ref: set-battle-styles/conkeldurr.ts (Hammer Pressure)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const defending = effect.opponent.active.getPokemonCard();
      if (defending && defending.stage !== Stage.BASIC) {
        return DEFENDING_POKEMON_CANNOT_ATTACK(store, state, effect, this);
      }
    }

    return state;
  }
}

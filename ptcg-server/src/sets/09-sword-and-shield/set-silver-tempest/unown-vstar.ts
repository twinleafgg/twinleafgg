import { PokemonCard, CardTag, Stage, CardType, StoreLike, State, GameError, GameMessage } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { THIS_POKEMON_GAINS_OPPONENT_WEAKNESS_ABILITY_WHILE_IN_PLAY } from "../../../game/store/prefabs/effect-of-attack-prefabs";
import { WAS_ATTACK_USED, MULTIPLE_COIN_FLIPS_PROMPT } from "../../../game/store/prefabs/prefabs";

export class UnownVSTAR extends PokemonCard {
  protected _tags = [CardTag.POKEMON_VSTAR];
  public regulationMark = 'F';
  public stage: Stage = Stage.VSTAR;
  public evolvesFrom = 'Unown V';
  public cardType: CardType[] = [P];
  public hp: number = 250;
  public weakness = [{ type: D }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [C];

  public attacks = [{
    name: 'Tri Power',
    cost: [P],
    damage: 70,
    damageCalculation: 'x',
    text: 'Flip 3 coins. This attack does 70 damage for each heads.',
  },
  {
    name: 'Star Cipher',
    cost: [C, C, C],
    damage: 0,
    text: "Until this Pokémon leaves play, it gains an Ability that has the effect \"The Weakness of each of your opponent's Pokémon in play is now [P]. (The amount of Weakness doesn't change.)\" (You can't use more than 1 VSTAR Power in a game.)",
  }];

  public set: string = 'SIT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '66';
  public name: string = 'Unown VSTAR';
  public fullName: string = 'Unown VSTAR SIT';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Tri Power
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      return MULTIPLE_COIN_FLIPS_PROMPT(store, state, player, 3, (results) => {
        let heads: number = 0;
        results.forEach((r) => {
          if (r) heads++;
        });
        effect.damage = 70 * heads;
      });
    }
    // Star Cipher
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      if (player.usedVSTAR === true) {
        throw new GameError(GameMessage.LABEL_VSTAR_USED);
      }

      player.usedVSTAR = true;
      THIS_POKEMON_GAINS_OPPONENT_WEAKNESS_ABILITY_WHILE_IN_PLAY(effect, CardType.PSYCHIC);
    }

    return state;
  }
}

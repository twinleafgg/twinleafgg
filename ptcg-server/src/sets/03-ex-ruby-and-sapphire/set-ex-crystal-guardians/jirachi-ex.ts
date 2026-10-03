import { PokemonCard, Stage, CardTag, CardType, PowerType, StoreLike, State, StateUtils, PlayerType } from "../../../game";
import { CheckAttackCostEffect } from "../../../game/store/effects/check-effects";
import { Effect } from "../../../game/store/effects/effect";
import { POKEPOWER_TYPES } from "../../../game/store/prefabs/ability-lock";
import { OPPONENT_POKEMON_HAVE_NO_ABILITIES } from "../../../game/store/prefabs/effect-of-attack-prefabs";
import { IS_POKEBODY_BLOCKED, WAS_ATTACK_USED } from "../../../game/store/prefabs/prefabs";

export class Jirachiex extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [P];
  public hp: number = 90;
  public retreat = [C];

  public powers = [{
    name: 'Star Light',
    powerType: PowerType.POKEBODY,
    text: 'As long as your opponent has any Pokémon-ex or Stage 2 Evolved Pokémon in play, Jirachi ex pays [C] less Energy to use Shield Beam or Super Psy Bolt.',
  }];

  public attacks = [{
    name: 'Shield Beam',
    cost: [P, C],
    damage: 30,
    text: "During your opponent's next turn, your opponent can't use any Poké-Powers on his or her Pokémon.",
  },
  {
    name: 'Super Psy Bolt',
    cost: [P, C, C],
    damage: 50,
    text: '',
  }];

  public set: string = 'CG';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '94';
  public name: string = 'Jirachi ex';
  public fullName: string = 'Jirachi ex CG';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Shield Beam
    if (effect instanceof CheckAttackCostEffect && effect.attack === (this.attacks[0] || this.attacks[1])) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }

      let isThingInPlay = false;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card) => {
        if (card.stage === Stage.STAGE_2 || card.hasTag(CardTag.POKEMON_ex)) {
          isThingInPlay = true;
        }
      });

      if (!isThingInPlay) {
        return state;
      }

      const costToRemove = 1;
      for (let i = 0; i < costToRemove; i++) {
        const index = effect.cost.indexOf(CardType.COLORLESS);
        if (index !== -1) {
          effect.cost.splice(index, 1);
        }
      }
    }
    // Super Psy Bolt
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return OPPONENT_POKEMON_HAVE_NO_ABILITIES(store, state, effect, this, {
        powerTypes: POKEPOWER_TYPES,
        mode: 'block',
      });
    }

    return state;
  }
}

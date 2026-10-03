import { PokemonCard, Stage, CardType, StoreLike, State, StateUtils, PlayerType, EnergyCard, EnergyType } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import {WAS_ATTACK_USED, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";
import { DEFENDING_POKEMON_ATTACKS_COST_MORE } from "../../../game/store/prefabs/effect-of-attack-prefabs";

export class PorygonZ extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Porygon2';
  public cardType: CardType[] = [C];
  public hp: number = 130;
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Cyber Crush',
    cost: [C],
    damage: 0,
    text: 'Discard all Special Energy attached to each of your opponent\'s Pokémon.'
  },
  {
    name: 'Slowing Beam',
    cost: [C, C, C],
    damage: 70,
    text: 'During your opponent\'s next turn, the Defending Pokémon\'s attacks cost Colorless more.'
  }];

  public set: string = 'AOR';
  public setNumber: string = '66';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Porygon-Z';
  public fullName: string = 'Porygon-Z AOR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cyber Crush
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      opponent.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const specialEnergy = cardList.cards.filter(c =>
          c instanceof EnergyCard && c.energyType === EnergyType.SPECIAL
        );
        specialEnergy.forEach(c => {
          MOVE_CARDS(store, state, cardList, opponent.discard, { cards: [c], sourceCard: this });
        });
      });
    }
    // Slowing Beam
    if (WAS_ATTACK_USED(effect, 1, this)) {
      state = DEFENDING_POKEMON_ATTACKS_COST_MORE(store, state, effect, 1);
    }

    return state;
  }
}

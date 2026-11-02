import { ChooseAttackPrompt, GameMessage, PlayerType, PokemonCard, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { Effect } from '../../../game/store/effects/effect';
import { THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Relicanth extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [F];
  public hp: number = 80;
  public weakness = [{ type: G, value: +20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Grand Swell',
    cost: [F],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 30 damage to that Pokémon for each Pokémon Tool and Stadium card your opponent has in play. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }, {
    name: 'Amnesia',
    cost: [F, C],
    damage: 30,
    text: 'Choose 1 of the Defending Pokémon\'s attacks. That Pokémon can\'t use that attack during your opponent\'s next turn.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '79';
  public name: string = 'Relicanth';
  public fullName: string = 'Relicanth SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Grand Swell
    if (WAS_ATTACK_USED(effect, 0, this)) {
      let count = 0;
      effect.opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        count += cardList.tools.length;
      });
      const stadiumCard = StateUtils.getStadiumCard(state);
      if (stadiumCard) {
        const stadiumList = StateUtils.findCardList(state, stadiumCard);
        if (StateUtils.findOwner(state, stadiumList) === effect.opponent) {
          count += 1;
        }
      }
      THIS_ATTACK_DOES_X_DAMAGE_TO_1_OF_YOUR_OPPONENTS_POKEMON(30 * count, effect, store, state);
    }

    // Amnesia
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const pokemonCard = effect.opponent.active.getPokemonCard();
      if (pokemonCard === undefined || pokemonCard.attacks.length === 0) {
        return state;
      }
      return store.prompt(state, new ChooseAttackPrompt(
        effect.player.id,
        GameMessage.CHOOSE_ATTACK_TO_DISABLE,
        [pokemonCard],
        { allowCancel: false }
      ), result => {
        if (!result) {
          return;
        }
        THIS_POKEMON_CANNOT_USE_THIS_ATTACK_NEXT_TURN(effect.opponent, result);
      });
    }

    return state;
  }
}

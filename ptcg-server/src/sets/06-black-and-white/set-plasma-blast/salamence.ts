import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType } from '../../../game/store/card/card-types';
import { GameMessage, PlayerType, PowerType, StoreLike, State, StateUtils } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {IS_ABILITY_BLOCKED, JUST_EVOLVED, WAS_ATTACK_USED, DISCARD_A_STADIUM_CARD_IN_PLAY, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ConfirmPrompt } from '../../../game/store/prompts/confirm-prompt';

export class Salamence extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Shelgon';
  public cardType: CardType[] = [N];
  public hp: number = 150;
  public weakness = [{ type: N }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Breakwing',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'When you play this Pokémon from your hand to evolve 1 of your Pokémon, you may discard all Pokémon Tool cards attached to each of your opponent\'s Pokémon.'
  }];

  public attacks = [
    {
      name: 'Gaia Crush',
      cost: [R, W, C, C],
      damage: 100,
      text: 'Discard any Stadium card in play.'
    }
  ];

  public set: string = 'PLB';
  public setNumber: string = '64';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Salamence';
  public fullName: string = 'Salamence PLB';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ability: Breakwing - when evolved, discard all opponent's tools
    if (JUST_EVOLVED(effect, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }

      const opponent = StateUtils.getOpponent(state, player);

      // Check if opponent has any tools attached
      let hasTools = false;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
        if (cardList.tools.length > 0) {
          hasTools = true;
        }
      });

      if (!hasTools) {
        return state;
      }

      store.prompt(state, new ConfirmPrompt(
        player.id,
        GameMessage.WANT_TO_USE_ABILITY
      ), result => {
        if (!result) {
          return;
        }
        opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList) => {
          const tools = cardList.tools.slice();
          tools.forEach(tool => {
            MOVE_CARDS(store, state, cardList, opponent.discard, { cards: [tool], sourceCard: this });
          });
        });
      });
    }

    // Attack: Gaia Crush
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_A_STADIUM_CARD_IN_PLAY(state);
    }

    return state;
  }
}

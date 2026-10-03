import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike, State, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, SHUFFLE_DECK, ADD_PARALYZED_TO_PLAYER_ACTIVE, AFTER_ATTACK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { ChooseCardsPrompt } from '../../../game/store/prompts/choose-cards-prompt';

export class Zebstrika extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Blitzle';
  public cardType: CardType[] = [L];
  public hp: number = 90;
  public weakness = [{ type: F }];
  public retreat = [];

  public attacks = [{
    name: 'Charge',
    cost: [L],
    damage: 0,
    text: 'Search your deck for a [L] Energy card and attach it to this Pokémon. Shuffle your deck afterward.'
  },
  {
    name: 'Lightning Crash',
    cost: [L, L, C],
    damage: 80,
    text: 'The Defending Pokémon is now Paralyzed.'
  }];

  public set: string = 'BLW';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '43';
  public name: string = 'Zebstrika';
  public fullName: string = 'Zebstrika BLW';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        player.deck,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Lightning Energy' },
        { min: 0, max: 1, allowCancel: false }
      ), cards => {
        cards = cards || [];
        if (cards.length > 0) {
          MOVE_CARDS(store, state, player.deck, player.active, { cards: cards, sourceCard: this });
        }
        SHUFFLE_DECK(store, state, player);
      });
    }

    if (AFTER_ATTACK(effect, 1, this)) {
      ADD_PARALYZED_TO_PLAYER_ACTIVE(store, state, effect.opponent, this);
    }

    return state;
  }
}

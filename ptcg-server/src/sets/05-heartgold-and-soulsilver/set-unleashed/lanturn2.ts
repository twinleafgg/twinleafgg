import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Card, ChooseCardsPrompt, ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED } from '../../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Lanturn2 extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Chinchou';
  public hp: number = 90;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Confuse Ray',
    cost: [L],
    damage: 20,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Confused.'
  },
  {
    name: 'Reflect Energy',
    cost: [L, C, C],
    damage: 60,
    text: 'Move an Energy card attached to Lanturn to 1 of your Benched Pokémon.'
  }];

  public set: string = 'UL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '18';
  public name: string = 'Lanturn';
  public fullName: string = 'Lanturn UL2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Confuse Ray
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_CONFUSED(store, state, effect);
        }
      });
    }

    // Reflect Energy
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const hasEnergy = player.active.cards.some(c => c.superType === SuperType.ENERGY);
      const hasBench = player.bench.some(b => b.cards.length > 0);
      if (!hasEnergy || !hasBench) {
        return state;
      }

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        player.active,
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const cards: Card[] = selected || [];
        if (cards.length === 0) {
          return;
        }
        store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { min: 1, max: 1, allowCancel: false }
        ), targets => {
          if (targets && targets.length > 0) {
            MOVE_CARDS(store, state, player.active, targets[0], { cards: [cards[0]], sourceCard: this });
          }
        });
      });
    }

    return state;
  }
}

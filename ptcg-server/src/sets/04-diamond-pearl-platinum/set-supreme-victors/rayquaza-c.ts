import { ChooseCardsPrompt, GameMessage, State, StoreLike } from '../../../game';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { MOVE_CARDS, MULTIPLE_COIN_FLIPS_PROMPT, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class RayquazaC extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public cardType: CardType[] = [C];
  public hp: number = 100;
  public weakness = [{ type: C, value: +30 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Trash Burst',
    cost: [C],
    damage: 10,
    damageCalculation: '+',
    text: 'You may discard up to 5 Energy cards from your hand. If you do, this attack does 10 damage plus 10 more damage for each Energy card you discarded.'
  }, {
    name: 'Twister',
    cost: [C, C, C, C],
    damage: 50,
    text: 'Flip 2 coins. If both are tails, this attack does nothing. For each heads, discard an Energy attached to the Defending Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '8';
  public name: string = 'Rayquaza C';
  public fullName: string = 'Rayquaza C SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Trash Burst
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const energyCount = player.hand.cards.filter(c => c.superType === SuperType.ENERGY).length;
      if (energyCount === 0) {
        return state;
      }
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 0, max: Math.min(5, energyCount) },
      ), cards => {
        cards = cards || [];
        if (cards.length === 0) {
          return;
        }
        MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
        effect.damage += cards.length * 10;
      });
    }

    // Twister
    if (WAS_ATTACK_USED(effect, 1, this)) {
      MULTIPLE_COIN_FLIPS_PROMPT(store, state, effect.player, 2, results => {
        if (results.every(result => !result)) {
          effect.damage = 0;
        }
        const headsCount = results.filter(result => result).length;
        if (headsCount > 0) {
          DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON(store, state, effect, undefined, headsCount);
        }
      });
    }

    return state;
  }
}

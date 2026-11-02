import { ChooseCardsPrompt } from '../../../game';
import { EnergyCard } from '../../../game';
import { GameMessage } from '../../../game';
import { State } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import { DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK } from '../../../game/store/prefabs/effect-of-attack-prefabs';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Magmortar extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Magmar';
  public hp: number = 100;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: 30 }];
  public retreat = [C, C, C];

  public attacks = [{
    name: 'Smoke Bomb',
    cost: [R, C],
    damage: 30,
    text: 'If the Defending Pokémon tries to attack during your opponent\'s next turn, your opponent flips a coin. If tails, that attack does nothing.'
  },
  {
    name: 'Flame Drum',
    cost: [R, R, C],
    damage: 80,
    text: 'If Magby isn\'t anywhere under Magmortar, discard 2 Energy cards from your hand. (If you can\'t discard 2 Energy cards from your hand, this attack does nothing.)'
  }];

  public set: string = 'DPP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'DP20';
  public name: string = 'Magmortar';
  public fullName: string = 'Magmortar DPP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Smoke Bomb
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return DEFENDING_POKEMON_FLIPS_COIN_TO_ATTACK(store, state, effect, this);
    }

    // Flame Drum
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const hasMagby = player.active.getPokemons().some(p => p.name === 'Magby');
      if (hasMagby) {
        return state;
      }
      const energyInHand = player.hand.cards.filter(c => c instanceof EnergyCard);
      if (energyInHand.length < 2) {
        effect.damage = 0;
        return state;
      }
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY },
        { min: 2, max: 2, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        if (cards.length < 2) {
          effect.damage = 0;
          return;
        }
        MOVE_CARDS(store, state, player.hand, player.discard, { cards, sourceCard: this });
      });
    }

    return state;
  }
}

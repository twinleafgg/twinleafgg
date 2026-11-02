import { PokemonCard } from '../../game';
import { Stage } from '../../game';
import { CardTag } from '../../game';
import { CardType } from '../../game';
import { EnergyType } from '../../game';
import { SuperType } from '../../game';
import { ChooseCardsPrompt } from '../../game';
import { GameMessage } from '../../game';
import { EnergyCard } from '../../game';
import { State } from '../../game';
import { StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { MOVE_CARDS } from '../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class TyranitarEx extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  protected _tags = [CardTag.POKEMON_ex];
  public evolvesFrom: string = 'Pupitar';
  public hp: number = 150;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -30 }];
  public retreat = [C, C, C, C];

  public attacks = [{
    // Scratch
    name: 'Scratch',
    cost: [C],
    damage: 20,
    text: ''
  }, {
    // Critical Crush
    name: 'Critical Crush',
    cost: [D, D, C, C],
    damage: 80,
    text: 'Discard 2 Basic Energy cards attached to Tyranitar ex or this attack does nothing.'
  }];

  public set: string = 'P1';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '17';
  public name: string = 'Tyranitar ex';
  public fullName: string = 'Tyranitar ex P1';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Critical Crush
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const basicEnergy = player.active.cards.filter(c => c instanceof EnergyCard && c.energyType === EnergyType.BASIC);
      if (basicEnergy.length < 2) {
        effect.damage = 0;
        return state;
      }
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.active,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { min: 2, max: 2, allowCancel: false }
      ), selected => {
        const cards = selected || [];
        if (cards.length < 2) {
          effect.damage = 0;
          return;
        }
        MOVE_CARDS(store, state, player.active, player.discard, { cards, sourceCard: this });
      });
    }

    return state;
  }
}

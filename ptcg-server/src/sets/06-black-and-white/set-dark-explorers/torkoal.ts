import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType, EnergyType } from '../../../game/store/card/card-types';
import { StoreLike, State, ChooseCardsPrompt, GameMessage } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Torkoal extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [R];
  public hp: number = 90;
  public weakness = [{ type: W }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Flame Cloak',
    cost: [C],
    damage: 10,
    text: 'Flip a coin. If heads, attach a [R] Energy card from your discard pile to this Pokémon.'
  }, {
    name: 'Heat Blast',
    cost: [R, C, C],
    damage: 60,
    text: ''
  }];

  public set: string = 'DEX';
  public setNumber: string = '18';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Torkoal';
  public fullName: string = 'Torkoal DEX';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Flame Cloak
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;

      return COIN_FLIP_PROMPT(store, state, player, result => {
        if (!result) {
          return;
        }

        const fireEnergy = player.discard.cards.filter(c =>
          c.superType === SuperType.ENERGY &&
          c.energyType === EnergyType.BASIC &&
          c.name === 'Fire Energy'
        );

        if (fireEnergy.length === 0) {
          return;
        }

        store.prompt(state, new ChooseCardsPrompt(
          player,
          GameMessage.CHOOSE_CARD_TO_ATTACH,
          player.discard,
          { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
          { min: 0, max: 1, allowCancel: true }
        ), selected => {
          if (selected && selected.length > 0) {
            MOVE_CARDS(store, state, player.discard, player.active, { cards: [selected[0]], sourceCard: this });
          }
        });
      });
    }

    return state;
  }
}

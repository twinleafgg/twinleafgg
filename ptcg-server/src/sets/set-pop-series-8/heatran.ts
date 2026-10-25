import { PokemonCard, CardType, EnergyType, Stage, SuperType, ChooseCardsPrompt, EnergyCard, GameMessage, State, StoreLike } from '../../game';
import { Effect } from '../../game/store/effects/effect';
import { YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED } from '../../game/store/prefabs/attack-effects';
import { COIN_FLIP_PROMPT, MOVE_CARDS, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class Heatran extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 100;
  public cardType: CardType[] = [R];
  public weakness = [{ type: W, value: 30 }];
  public retreat = [C, C, C];

  public attacks = [{
    // Body Slam
    name: 'Body Slam',
    cost: [C, C],
    damage: 20,
    text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.'
  }, {
    // Fire Spin
    name: 'Fire Spin',
    cost: [R, R, R, C],
    damage: 90,
    text: 'Discard 2 Basic Energy cards attached to Heatran. (If you can\'t discard cards, this attack does nothing.)'
  }];

  public set: string = 'P8';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '1';
  public name: string = 'Heatran';
  public fullName: string = 'Heatran P8';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Body Slam
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          YOUR_OPPPONENTS_ACTIVE_POKEMON_IS_NOW_PARALYZED(store, state, effect);
        }
      });
    }
    // Fire Spin
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

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { AttachEnergyPrompt, EnergyCard, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Minun extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 60;
  public cardType: CardType[] = [L];
  public weakness = [{ type: F, value: 10 }];
  public resistance = [{ type: M, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Call for Family',
    cost: [],
    damage: 0,
    text: 'Search your deck for up to 2 Lightning Basic Pokémon and put them onto your Bench. Shuffle your deck afterward.'
  },
{
    name: 'Trash Charge',
    cost: [L],
    damage: 10,
    text: 'Search your discard pile for a Lightning Energy card and attach it to 1 of your Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '71';
  public name: string = 'Minun';
  public fullName: string = 'Minun SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Call for Family
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      SEARCH_YOUR_DECK_FOR_POKEMON_AND_PUT_ONTO_BENCH(store, state, effect.player, { stage: Stage.BASIC }, { min: 0, max: 2 });
    }

    // Trash Charge
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const hasEnergyInDiscard = player.discard.cards.some(c =>
      c instanceof EnergyCard &&
      c.energyType === EnergyType.BASIC &&
      c.provides.includes(CardType.FIRE)
      );
      if (!hasEnergyInDiscard) {
      return state;
      }
      return store.prompt(state, new AttachEnergyPrompt(
      player.id,
      GameMessage.ATTACH_ENERGY_CARDS,
      player.discard,
      PlayerType.BOTTOM_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
      { allowCancel: true, min: 0, max: 1 }
      ), transfers => {
      transfers = transfers || [];
      for (const transfer of transfers) {
      const target = StateUtils.getTarget(state, player, transfer.to);
      MOVE_CARDS(store, state, player.discard, target, {
      cards: [transfer.card],
      sourceCard: this,
      sourceEffect: this.attacks[0],
      });
      }
      });
    }

    return state;
  }
}

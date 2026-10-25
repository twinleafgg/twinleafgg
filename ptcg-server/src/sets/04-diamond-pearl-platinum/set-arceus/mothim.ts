import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, GameMessage, PlayerType, PokemonCard, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { ATTACH_ENERGY_PROMPT, MOVE_CARDS, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Mothim extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Burmy';
  public hp: number = 90;
  public cardType: CardType[] = [G];
  public weakness = [{ type: R, value: +20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [];

  public attacks = [{
    name: 'Cloak Party',
    cost: [],
    damage: 0,
    text: 'Search your deck for up to 3 in any combination of Burmy and Wormadam, show them to your opponent, and put them into your hand. Shuffle your deck afterward.'
  }, {
    name: 'Energy Assist',
    cost: [C],
    damage: 30,
    text: 'Search your discard pile for a basic Energy card and attach it to 1 of your Benched Pokémon.'
  }];

  public set: string = 'AR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '6';
  public name: string = 'Mothim';
  public fullName: string = 'Mothim AR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cloak Party
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (player.deck.cards.length === 0) {
        return state;
      }
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof PokemonCard) || (!card.name.startsWith('Burmy') && !card.name.startsWith('Wormadam'))) {
          blocked.push(index);
        }
      });
      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.POKEMON },
        { min: 0, max: 3, allowCancel: true, blocked }
      ), selected => {
        const cards = selected || [];
        if (cards.length > 0) {
          SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
          MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard: this });
        }
        SHUFFLE_DECK(store, state, player);
      });
    }

    // Energy Assist
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const hasBench = player.bench.some(b => b.cards.length > 0);
      const hasEnergy = player.discard.cards.some(c => c.superType === SuperType.ENERGY);
      if (!hasBench || !hasEnergy) {
        return state;
      }
      return ATTACH_ENERGY_PROMPT(
        store,
        state,
        player,
        PlayerType.BOTTOM_PLAYER,
        SlotType.DISCARD,
        [SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
        { min: 1, max: 1, allowCancel: false }
      );
    }

    return state;
  }
}

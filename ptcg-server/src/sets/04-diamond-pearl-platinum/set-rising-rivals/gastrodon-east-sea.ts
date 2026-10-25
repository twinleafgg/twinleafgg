import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { CardTarget, ChooseCardsPrompt, EnergyCard, GameMessage, MoveEnergyPrompt, PlayerType, PowerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MovedFromActiveToBenchEffect } from '../../../game/store/effects/game-effects';
import { PlayPokemonFromDeckEffect } from '../../../game/store/effects/play-card-effects';
import { GET_PLAYER_BENCH_SLOTS, IS_POKEBODY_BLOCKED, MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class GastrodonEastSea extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Shellos East Sea';
  public hp: number = 90;
  public cardType: CardType[] = [W];
  public weakness = [{ type: G, value: +30 }];
  public resistance = [{ type: L, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Sticky Hold',
    powerType: PowerType.POKEBODY,
    text: 'If Gastrodon East Sea is switched or retreats to your Bench, move as many Energy cards attached to Gastrodon East Sea as you like to the new Active Pokémon.'
  }];

  public attacks = [{
    name: 'Calling Wave',
    cost: [C],
    damage: 0,
    text: 'Search your deck for up to 2 Gastrodon and put them onto your Bench as Basic Pokémon. Put 2 damage counters on each of them. Shuffle your deck afterward.'
  }, {
    name: 'Wave Splash',
    cost: [W, C],
    damage: 40,
    text: ''
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '21';
  public name: string = 'Gastrodon East Sea';
  public fullName: string = 'Gastrodon East Sea RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sticky Hold
    if (effect instanceof MovedFromActiveToBenchEffect && effect.pokemonCard === this) {
      const player = effect.player;
      if (IS_POKEBODY_BLOCKED(store, state, player, this)) {
        return state;
      }
      const gastrodonSlot = StateUtils.findPokemonSlot(state, this);
      if (!gastrodonSlot || !gastrodonSlot.cards.some(c => c instanceof EnergyCard)) {
        return state;
      }

      const blockedFrom: CardTarget[] = [];
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
        if (list !== gastrodonSlot) {
          blockedFrom.push(target);
        }
        if (target.slot !== SlotType.ACTIVE) {
          blockedTo.push(target);
        }
      });

      return store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: true, min: 0, blockedFrom, blockedTo },
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    // Calling Wave
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      if (player.deck.cards.length === 0) {
        return state;
      }
      const slots = GET_PLAYER_BENCH_SLOTS(player);
      if (slots.length === 0) {
        return state;
      }
      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        if (!(card instanceof PokemonCard) || !card.name.startsWith('Gastrodon')) {
          blocked.push(index);
        }
      });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_PUT_ONTO_BENCH,
        player.deck,
        { superType: SuperType.POKEMON },
        { min: 0, max: Math.min(2, slots.length), allowCancel: true, blocked },
      ), selected => {
        const cards = selected || [];
        cards.forEach((card, index) => {
          store.reduceEffect(state, new PlayPokemonFromDeckEffect(player, card as PokemonCard, slots[index]));
          slots[index].damage += 20;
        });
        SHUFFLE_DECK(store, state, player);
      });
    }

    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { Card, CardList, ChooseEnergyPrompt, EnergyCard, GameError, GameMessage, PokemonCardList, PowerType, State, StoreLike } from '../../../game';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { getDualLegendHalvesInHand } from '../../../game/store/dual-legend-utils';
import { CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED, MOVE_CARDS, SHOW_CARDS_TO_PLAYER, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class LugiaLEGEND extends PokemonCard {
  public stage: Stage = Stage.LEGEND;
  protected _tags = [CardTag.LEGEND, CardTag.DUAL_LEGEND];
  public hp: number = 130;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public powers = [{
    name: 'Legend Assembly',
    text: 'Put this card from your hand onto your Bench only with the other half of Lugia LEGEND.',
    exemptFromAbilityLock: true,
    useFromHand: true,
    powerType: PowerType.LEGEND_ASSEMBLY,
  },
  {
    name: 'Ocean Grow',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn, when you put Lugia LEGEND into play, you may look at the top 5 cards of your deck and attach all Energy cards you find there to Lugia LEGEND. Discard the other cards.'
  }];

  public attacks = [{
    name: 'Elemental Blast',
    cost: [R, W, L],
    damage: 200,
    text: 'Discard a Fire Energy, Water Energy, and Lightning Energy attached to Lugia LEGEND.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '113';
  public name: string = 'Lugia LEGEND';
  public fullName: string = 'Lugia LEGEND HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Legend Assembly
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const slots: PokemonCardList[] = player.bench.filter(b => b.cards.length === 0);
      if (slots.length === 0) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const halves = getDualLegendHalvesInHand(player, this);
      if (halves.length < 2) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      MOVE_CARDS(store, state, player.hand, slots[0], { cards: halves, sourceCard: this });
      slots[0].pokemonPlayedTurn = state.turn;

      if (IS_POKEPOWER_BLOCKED(store, state, player, this) || player.deck.cards.length === 0) {
        return state;
      }

      CONFIRMATION_PROMPT(store, state, player, wantToUse => {
        if (!wantToUse) {
          return;
        }

        const deckTop = new CardList();
        MOVE_CARDS(store, state, player.deck, deckTop, {
          count: Math.min(5, player.deck.cards.length),
          sourceCard: this,
        });
        SHOW_CARDS_TO_PLAYER(store, state, player, deckTop.cards);

        const energies = deckTop.cards.filter(c => c instanceof EnergyCard) as EnergyCard[];
        const others = deckTop.cards.filter(c => c.superType !== SuperType.ENERGY);
        energies.forEach(energy => {
          store.reduceEffect(state, new AttachEnergyEffect(player, energy, slots[0]));
        });
        if (others.length > 0) {
          MOVE_CARDS(store, state, deckTop, player.discard, { cards: others, sourceCard: this });
        }
      });
    }

    // Elemental Blast
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
      state = store.reduceEffect(state, checkProvidedEnergy);

      return store.prompt(state, new ChooseEnergyPrompt(
        player.id,
        GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
        checkProvidedEnergy.energyMap,
        [CardType.FIRE, CardType.WATER, CardType.LIGHTNING],
        { allowCancel: false },
      ), energy => {
        const cards: Card[] = (energy || []).map(e => e.card);
        const discardEnergy = new DiscardCardsEffect(effect, cards);
        discardEnergy.target = player.active;
        store.reduceEffect(state, discardEnergy);
      });
    }

    return state;
  }
}

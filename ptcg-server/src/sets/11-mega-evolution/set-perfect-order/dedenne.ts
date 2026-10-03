import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, AttachEnergyPrompt, PlayerType, SlotType, GameMessage, pokemonHasCardType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CoinFlipEffect } from '../../../game/store/effects/play-card-effects';
import {WAS_ATTACK_USED, ADD_PARALYZED_TO_PLAYER_ACTIVE, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Dedenne extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [L];
  public hp: number = 70;
  public weakness = [{ type: F }];
  public retreat = [C];

  public attacks = [{
    name: 'Tail Generator',
    cost: [L],
    damage: 0,
    text: 'Choose Basic [L] Energy cards from your discard pile up to the amount of Energy attached to all of your opponent\'s Pokémon and attach them to your [L] Pokémon in any way you like.'
  },
  {
    name: 'Thunder Shock',
    cost: [L, C],
    damage: 30,
    text: 'Flip a coin. If heads, your opponent\'s Active Pokémon is now Paralyzed.'
  }];

  public regulationMark = 'J';
  public set: string = 'POR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '29';
  public name: string = 'Dedenne';
  public fullName: string = 'Dedenne M3';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Tail Generation - attach Basic Lightning Energy from discard for each energy on opponent's Pokemon
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Count total energies on opponent's Pokemon
      let totalEnergies = 0;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
        totalEnergies += cardList.energies.cards.length;
      });

      if (totalEnergies === 0) {
        return state;
      }

      // Count Basic Lightning Energy in discard
      const lightningEnergyInDiscard = player.discard.cards.filter(c =>
        c.superType === SuperType.ENERGY &&
        c.energyType === EnergyType.BASIC &&
        (c as import('../../../game/store/card/energy-card').EnergyCard).provides.includes(CardType.LIGHTNING)
      );

      if (lightningEnergyInDiscard.length === 0) {
        return state;
      }

      const maxToAttach = Math.min(totalEnergies, lightningEnergyInDiscard.length);

      // Find Lightning Pokemon to attach to
      const lightningPokemon: any[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
        const pokemonCard = cardList.getPokemonCard();
        if (pokemonCard && pokemonHasCardType(pokemonCard, CardType.LIGHTNING)) {
          lightningPokemon.push(cardList);
        }
      });

      if (lightningPokemon.length === 0) {
        return state;
      }

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.discard,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, provides: [CardType.LIGHTNING] },
        { allowCancel: false, min: 0, max: maxToAttach }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
        }
      });
    }

    // Thunder Shock - coin flip for paralysis
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const coinFlipEffect = new CoinFlipEffect(player, (result: boolean) => {
        if (result === true) {
          ADD_PARALYZED_TO_PLAYER_ACTIVE(store, state, opponent, this);
        }
      });

      return store.reduceEffect(state, coinFlipEffect);
    }

    return state;
  }
}

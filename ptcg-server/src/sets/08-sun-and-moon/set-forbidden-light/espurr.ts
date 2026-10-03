import { CardTarget, CardTransfer, EnergyCard, GameMessage, MoveEnergyPrompt, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardType, Stage, SuperType } from '../../../game/store/card/card-types';
import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Espurr extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [P];
  public hp: number = 60;
  public weakness = [{ type: P }];
  public retreat = [C];

  public attacks = [{
    name: 'Energy Teaser',
    cost: [P],
    damage: 0,
    text: 'Move an Energy from 1 of your opponent\'s Benched Pokémon to another of their Pokémon.'
  }];

  public set: string = 'FLI';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '44';
  public name: string = 'Espurr';
  public fullName: string = 'Espurr FLI';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      let hasEnergy = false;
      let pokemonCount = 0;
      const blockedFrom: CardTarget[] = [];
      pokemonCount = 0;
      hasEnergy = false;

      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, card, target) => {
        pokemonCount += 1;
        if (cardList === opponent.active) {
          blockedFrom.push(target);
          return;
        }
        const energyAttached = cardList.cards.some(c => {
          return c instanceof EnergyCard;
        });
        hasEnergy = hasEnergy || energyAttached;
      });

      if (!hasEnergy || pokemonCount <= 1) {
        return state;
      }

      let transfers: CardTransfer[] = [];
      store.prompt(state, new MoveEnergyPrompt(
        player.id,
        GameMessage.MOVE_ENERGY_CARDS,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { min: 1, max: 1, allowCancel: false, blockedFrom }
      ), result => {
        transfers = result || [];
        transfers.forEach(transfer => {
          const source = StateUtils.getTarget(state, player, transfer.from);
          const target = StateUtils.getTarget(state, player, transfer.to);
          MOVE_CARDS(store, state, source, target, { cards: [transfer.card], sourceCard: this });
        });
      });

    }

    return state;
  }
}
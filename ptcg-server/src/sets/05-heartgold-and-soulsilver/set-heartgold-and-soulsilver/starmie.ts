import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, EnergyType, Stage, SuperType } from '../../../game/store/card/card-types';
import { EnergyCard, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { DiscardEnergyPrompt } from '../../../game/store/prompts/discard-energy-prompt';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Starmie extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Staryu';
  public hp: number = 90;
  public cardType: CardType[] = [W];
  public weakness = [{ type: L }];
  public retreat = [];

  public attacks = [{
    name: 'Cosmic Cyclone',
    cost: [W],
    damage: 20,
    damageCalculation: 'x',
    text: 'Choose as many Water Energy attached to your Pokémon as you like. This attack does 20 damage times the number of Energy you chose. Shuffle those cards back into your deck.'
  }];

  public set: string = 'HS';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '53';
  public name: string = 'Starmie';
  public fullName: string = 'Starmie HS';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Cosmic Cyclone
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const blockedMap: { source: any, blocked: number[] }[] = [];
      let availableWaterEnergy = 0;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, _card, target) => {
        const blocked: number[] = [];
        cardList.cards.forEach((card, index) => {
          const isWaterEnergy = card instanceof EnergyCard
            && card.energyType === EnergyType.BASIC
            && card.provides.includes(CardType.WATER);
          if (!isWaterEnergy) {
            blocked.push(index);
          } else {
            availableWaterEnergy++;
          }
        });
        blockedMap.push({ source: target, blocked });
      });

      if (availableWaterEnergy === 0) {
        effect.damage = 0;
        return state;
      }

      const attackEffect = effect;
      return store.prompt(state, new DiscardEnergyPrompt(
        player.id,
        GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { superType: SuperType.ENERGY },
        { allowCancel: false, min: 0, max: availableWaterEnergy, blockedMap }
      ), transfers => {
        transfers = transfers || [];
        attackEffect.damage = 20 * transfers.length;
        for (const transfer of transfers) {
          const source = StateUtils.getTarget(state, player, transfer.from);
          MOVE_CARDS(store, state, source, player.deck, { cards: [transfer.card], sourceCard: this });
        }
        SHUFFLE_DECK(store, state, player);
      });
    }

    return state;
  }
}

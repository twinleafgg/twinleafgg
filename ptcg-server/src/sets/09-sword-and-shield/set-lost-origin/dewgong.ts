import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, EnergyType, SuperType } from '../../../game/store/card/card-types';
import { StoreLike, State, StateUtils, PlayerType } from '../../../game';
import { DiscardEnergyPrompt } from '../../../game/store/prompts/discard-energy-prompt';
import { GameMessage } from '../../../game/game-message';
import { SlotType } from '../../../game/store/actions/play-card-action';
import { Effect } from '../../../game/store/effects/effect';
import { EnergyCard } from '../../../game/store/card/energy-card';
import {WAS_ATTACK_USED, COIN_FLIP_PROMPT, SHUFFLE_DECK, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PREVENT_DAMAGE, PREVENT_EFFECTS_OF_ATTACKS } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class Dewgong extends PokemonCard {
  public stage: Stage = Stage.STAGE_1;
  public evolvesFrom: string = 'Seel';
  public cardType: CardType[] = [W];
  public hp: number = 120;
  public weakness = [{ type: L }];
  public retreat = [C, C];

  public attacks = [{
    name: 'Swim Freely',
    cost: [W],
    damage: 10,
    text: 'Flip a coin. If heads, during your opponent\'s next turn, prevent all damage from and effects of attacks done to this Pokémon.'
  }, {
    name: 'Floe Return',
    cost: [C, C],
    damage: 40,
    damageCalculation: 'x',
    text: 'Shuffle any amount of [W] Energy from your Pokémon into your deck. This attack does 40 damage for each card you shuffled into your deck in this way.'
  }];

  public regulationMark: string = 'F';

  public set: string = 'LOR';
  public setNumber: string = '34';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Dewgong';
  public fullName: string = 'Dewgong LOR 34';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Swim Freely
    if (WAS_ATTACK_USED(effect, 0, this)) {
      COIN_FLIP_PROMPT(store, state, effect.player, result => {
        if (result) {
          PREVENT_DAMAGE(store, state, effect, this);
          PREVENT_EFFECTS_OF_ATTACKS(store, state, effect, this);
        }
      });
    }

    // Floe Return
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      const blockedMap: { source: any, blocked: number[] }[] = [];
      let availableWaterEnergy = 0;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, pokemonCard, target) => {
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
        const count = transfers.length;
        attackEffect.damage = 40 * count;

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

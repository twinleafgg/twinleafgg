import { EnergyCard } from '../../../game';
import { GameError } from '../../../game';
import { GameMessage } from '../../../game';
import { PlayerType } from '../../../game';
import { PokemonCard } from '../../../game';
import { PowerType } from '../../../game';
import { SlotType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { CardType } from '../../../game/store/card/card-types';
import { EnergyType } from '../../../game/store/card/card-types';
import { Stage } from '../../../game/store/card/card-types';
import { SuperType } from '../../../game/store/card/card-types';
import { CheckPokemonTypeEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { AttachEnergyPrompt } from '../../../game/store/prompts/attach-energy-prompt';
import { BLOCK_IF_HAS_SPECIAL_CONDITION } from '../../../game/store/prefabs/prefabs';
import { IS_POKEPOWER_BLOCKED } from '../../../game/store/prefabs/prefabs';
import { WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';
import { WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Feraligatr extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Croconaw';
  public hp: number = 140;
  public cardType: CardType[] = [W];
  public weakness = [{ type: G }];
  public retreat = [C, C, C];

  public powers = [{
    name: 'Rain Dance',
    useWhenInPlay: true,
    powerType: PowerType.POKEPOWER,
    text: 'As often as you like during your turn (before your attack), you may attach a Water Energy from your hand to 1 of your Water Pokémon. This power can\'t be used if Feraligatr is affected by a Special Condition.'
  }];

  public attacks = [{
    name: 'Hydro Crunch',
    cost: [W, W, W, W],
    damage: 60,
    damageCalculation: '+',
    text: 'Does 60 damage plus 10 more damage for each damage counter on the Defending Pokémon.'
  }];

  public set: string = 'HSP';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '7';
  public name: string = 'Feraligatr';
  public fullName: string = 'Feraligatr HSP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Rain Dance
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_POKEPOWER_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      const hasEnergyInHand = player.hand.cards.some(c => {
        return c instanceof EnergyCard
          && c.energyType === EnergyType.BASIC
          && c.provides.includes(CardType.WATER);
      });
      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      let hasWaterPokemon = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
        const checkPokemonTypeEffect = new CheckPokemonTypeEffect(cardList);
        store.reduceEffect(state, checkPokemonTypeEffect);
        if (checkPokemonTypeEffect.cardTypes.includes(CardType.WATER)) {
          hasWaterPokemon = true;
        }
      });
      if (!hasWaterPokemon) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      BLOCK_IF_HAS_SPECIAL_CONDITION(player, this);

      return store.prompt(state, new AttachEnergyPrompt(
        player.id,
        GameMessage.ATTACH_ENERGY_CARDS,
        player.hand,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.BENCH, SlotType.ACTIVE],
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Water Energy' },
        { allowCancel: true }
      ), transfers => {
        transfers = transfers || [];
        for (const transfer of transfers) {
          const target = StateUtils.getTarget(state, player, transfer.to);
          const checkTransferTypeEffect = new CheckPokemonTypeEffect(target);
          store.reduceEffect(state, checkTransferTypeEffect);
          if (!checkTransferTypeEffect.cardTypes.includes(CardType.WATER)) {
            throw new GameError(GameMessage.INVALID_TARGET);
          }
          const energyCard = transfer.card as EnergyCard;
          const attachEnergyEffect = new AttachEnergyEffect(player, energyCard, target);
          store.reduceEffect(state, attachEnergyEffect);
        }
      });
    }

    // Hydro Crunch
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);
      effect.damage += opponent.active.damage;
    }

    return state;
  }
}

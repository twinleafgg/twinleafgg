import {
  AttachEnergyPrompt,
  CardTag,
  CardType,
  EnergyCard,
  EnergyType,
  GameMessage,
  PlayerType,
  PokemonCard,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { CheckProvidedEnergyEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import {BLOCK_IF_GX_ATTACK_USED, WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PREVENT_DAMAGE, PREVENT_EFFECTS_OF_ATTACKS } from '../../../game/store/prefabs/effect-of-attack-prefabs';

export class LatiasAndLatiosGx extends PokemonCard {
  protected _tags = [CardTag.TAG_TEAM, CardTag.POKEMON_GX];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [N];
  public hp: number = 250;
  public weakness = [{ type: Y }];
  public retreat = [C];

  public attacks = [{
    name: 'Buster Purge',
    cost: [W, P, P, C],
    damage: 240,
    text: 'Discard 3 Energy from this Pokémon.'
  },
  {
    name: 'Aero Unit-GX',
    cost: [P],
    damage: 0,
    text: 'Attach 5 basic Energy cards from your discard pile to your Pokémon in any way you like. If this Pokémon has at least 1 extra Energy attached to it (in addition to this attack\'s cost), prevent all effects of attacks, including damage, done to it during your opponent\'s next turn. (You can\'t use more than 1 GX attack in a game.)'
  }];

  public set: string = 'TEU';
  public setNumber: string = '113';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Latias & Latios-GX';
  public fullName: string = 'Latias & Latios-GX TEU';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Buster Purge
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 3);
    }

    // Aero Unit-GX
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      BLOCK_IF_GX_ATTACK_USED(player);
      player.usedGX = true;

      const checkEnergy = new CheckProvidedEnergyEffect(player, player.active);
      store.reduceEffect(state, checkEnergy);
      const totalEnergy = checkEnergy.energyMap.reduce((sum, em) => sum + em.provides.length, 0);
      const hasExtraEnergy = totalEnergy >= 2;

      const basicEnergyInDiscard = player.discard.cards.filter(c =>
        c instanceof EnergyCard && c.energyType === EnergyType.BASIC
      );

      if (basicEnergyInDiscard.length > 0) {
        const maxAttach = Math.min(5, basicEnergyInDiscard.length);
        state = store.prompt(
          state,
          new AttachEnergyPrompt(
            player.id,
            GameMessage.ATTACH_ENERGY_CARDS,
            player.discard,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.ACTIVE, SlotType.BENCH],
            { superType: SuperType.ENERGY, energyType: EnergyType.BASIC },
            { allowCancel: false, min: maxAttach, max: 5 },
          ),
          (transfers) => {
            transfers = transfers || [];
            for (const transfer of transfers) {
              const target = StateUtils.getTarget(state, player, transfer.to);
              MOVE_CARDS(store, state, player.discard, target, { cards: [transfer.card], sourceCard: this });
            }
          },
        );
      }

      if (hasExtraEnergy) {
        PREVENT_DAMAGE(store, state, effect, this);
        PREVENT_EFFECTS_OF_ATTACKS(store, state, effect, this);
      }
    }

    return state;
  }
}

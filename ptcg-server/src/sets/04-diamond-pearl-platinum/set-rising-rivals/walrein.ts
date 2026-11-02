import { AttachEnergyPrompt, CardTarget, CardType, EnergyCard, GameMessage, PlayerType, PokemonCard, PowerType, SlotType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { AttachEnergyEffect } from '../../../game/store/effects/play-card-effects';
import { DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON } from '../../../game/store/prefabs/attack-effects';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED, JUST_EVOLVED, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Walrein extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Sealeo';
  public hp: number = 140;
  public cardType: CardType[] = [W];
  public weakness = [{ type: M, value: +30 }];
  public retreat = [C, C, C, C];

  public powers = [{
    name: 'Gather Ice',
    powerType: PowerType.POKEPOWER,
    text: 'Once during your turn (before your attack), when you play Walrein from your hand to evolve 1 of your Pokémon, you may attach as many Water Energy cards from your hand to Walrein as you like.'
  }];

  public attacks = [{
    name: 'Cold Crush',
    cost: [W, W, C, C],
    damage: 70,
    text: 'Discard an Energy card attached to Walrein and then discard an Energy card attached to the Defending Pokémon.'
  }];

  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '36';
  public name: string = 'Walrein';
  public fullName: string = 'Walrein RR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Gather Ice
    if (JUST_EVOLVED(effect, this) && !IS_POKEPOWER_BLOCKED(store, state, effect.player, this)) {
      const player = effect.player;
      const waterCount = player.hand.cards.filter(c => c instanceof EnergyCard && c.name === 'Water Energy').length;
      if (waterCount === 0) {
        return state;
      }
      CONFIRMATION_PROMPT(store, state, player, wantToUse => {
        if (!wantToUse) {
          return;
        }
        const blockedTo: CardTarget[] = [];
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, target) => {
          if (list !== effect.target) {
            blockedTo.push(target);
          }
        });
        store.prompt(state, new AttachEnergyPrompt(
          player.id,
          GameMessage.ATTACH_ENERGY_CARDS,
          player.hand,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.ACTIVE, SlotType.BENCH],
          { superType: SuperType.ENERGY, name: 'Water Energy' },
          { allowCancel: true, min: 0, max: waterCount, blockedTo }
        ), transfers => {
          transfers = transfers || [];
          for (const transfer of transfers) {
            const target = StateUtils.getTarget(state, player, transfer.to);
            store.reduceEffect(state, new AttachEnergyEffect(player, transfer.card as EnergyCard, target));
          }
        });
      }, GameMessage.WANT_TO_USE_ABILITY);
    }

    // Cold Crush
    if (WAS_ATTACK_USED(effect, 0, this)) {
      DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1);
      DISCARD_AN_ENERGY_FROM_OPPONENTS_ACTIVE_POKEMON(store, state, effect);
    }

    return state;
  }
}

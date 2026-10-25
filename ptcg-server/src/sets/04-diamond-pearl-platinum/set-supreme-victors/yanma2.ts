import { CardTarget, CardType, ChoosePokemonPrompt, GameMessage, MoveEnergyPrompt, PlayerType, PokemonCard, SlotType, Stage, State, StateUtils, StoreLike, SuperType } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { CONFIRMATION_PROMPT, MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Yanma2 extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [G];
  public weakness = [{ type: L, value: +20 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Sonicboom',
    cost: [C],
    damage: 10,
    text: 'This attack\'s damage isn\'t affected by Weakness or Resistance.'
  }, {
    name: 'Baton Pass',
    cost: [G, C, C],
    damage: 30,
    text: 'You may switch Yanma with 1 of your Benched Pokémon. If you do, move as many Energy cards attached to Yanma as you like to the new Active Pokémon.'
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = 'SH9';
  public name: string = 'Yanma';
  public fullName: string = 'Yanma SV2';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Sonicboom
    if (WAS_ATTACK_USED(effect, 0, this)) {
      effect.ignoreResistance = true;
      effect.ignoreWeakness = true;
    }

    // Baton Pass
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      if (!player.bench.some(b => b.cards.length > 0)) {
        return state;
      }
      CONFIRMATION_PROMPT(store, state, player, wantToSwitch => {
        if (!wantToSwitch) {
          return;
        }
        store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_SWITCH,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { allowCancel: false }
        ), selected => {
          const target = selected && selected[0];
          if (!target) {
            return;
          }
          const yanmaSlot = player.active;
          player.switchPokemon(target, store, state);
          const blockedFrom: CardTarget[] = [];
          const blockedTo: CardTarget[] = [];
          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (list, _card, cardTarget) => {
            if (list !== yanmaSlot) {
              blockedFrom.push(cardTarget);
            }
            if (list !== player.active) {
              blockedTo.push(cardTarget);
            }
          });
          store.prompt(state, new MoveEnergyPrompt(
            player.id,
            GameMessage.MOVE_ENERGY_CARDS,
            PlayerType.BOTTOM_PLAYER,
            [SlotType.ACTIVE, SlotType.BENCH],
            { superType: SuperType.ENERGY },
            { allowCancel: true, min: 0, blockedFrom, blockedTo }
          ), transfers => {
            transfers = transfers || [];
            for (const transfer of transfers) {
              const source = StateUtils.getTarget(state, player, transfer.from);
              const destination = StateUtils.getTarget(state, player, transfer.to);
              MOVE_CARDS(store, state, source, destination, { cards: [transfer.card], sourceCard: this });
            }
          });
        });
      }, GameMessage.WANT_TO_SWITCH_POKEMON);
    }

    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { Stage, CardType, SuperType } from '../../../game/store/card/card-types';
import { PowerType, StoreLike, State, GameMessage, PlayerType, SlotType, StateUtils, MoveEnergyPrompt, ConfirmPrompt, CardTarget, Card } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EndTurnEffect } from '../../../game/store/effects/game-phase-effects';
import {MOVED_TO_ACTIVE_THIS_TURN, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { PokemonCardList } from '../../../game/store/state/pokemon-card-list';

export class Latios extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [N];
  public hp: number = 130;
  public retreat = [C];

  public powers = [{
    name: 'Luster Assist',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn, when your Mega Latias ex moves from the Bench to the Active Spot, you may move any number of Energy from your Benched Pokémon to that Active Pokémon.'
  }];

  public attacks = [{
    name: 'Dragon Claw',
    cost: [W, P, C],
    damage: 130,
    text: ''
  }];

  public regulationMark = 'I';
  public set: string = 'MEG';
  public setNumber: string = '101';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Latios';
  public fullName: string = 'Latios M1S';

  private LUSTER_ASSIST_MARKER = 'LUSTER_ASSIST_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    const player = StateUtils.findOwner(state, StateUtils.findCardList(state, this));
    if (player === undefined) {
      return state;
    }
    const activePokemon = player.active.getPokemonCard();

    if (activePokemon && activePokemon.name === 'M Latias-EX' && MOVED_TO_ACTIVE_THIS_TURN(player, activePokemon)) {
      if (!player.marker.hasMarker(this.LUSTER_ASSIST_MARKER, this)) {

        let hasEnergyOnBench = false;
        player.bench.forEach((b: PokemonCardList) => {
          if (b.cards.some((c: Card) => c.superType === SuperType.ENERGY)) {
            hasEnergyOnBench = true;
          }
        });

        if (hasEnergyOnBench) {
          state = store.prompt(state, new ConfirmPrompt(
            player.id,
            GameMessage.WANT_TO_USE_ABILITY
          ), wantToUse => {
            if (wantToUse) {
              player.marker.addMarker(this.LUSTER_ASSIST_MARKER, this);

              const blockedFrom: CardTarget[] = [{ player: PlayerType.BOTTOM_PLAYER, slot: SlotType.ACTIVE, index: 0 }];
              const blockedTo: CardTarget[] = [];
              player.bench.forEach((b: PokemonCardList, index: number) => {
                blockedTo.push({ player: PlayerType.BOTTOM_PLAYER, slot: SlotType.BENCH, index: index });
              });

              store.prompt(state, new MoveEnergyPrompt(
                player.id,
                GameMessage.MOVE_ENERGY_CARDS,
                PlayerType.BOTTOM_PLAYER,
                [SlotType.ACTIVE, SlotType.BENCH],
                { superType: SuperType.ENERGY },
                { allowCancel: true, blockedFrom, blockedTo }
              ), transfers => {
                transfers = transfers || [];
                for (const transfer of transfers) {
                  const source = StateUtils.getTarget(state, player, transfer.from);
                  MOVE_CARDS(store, state, source, player.active, { cards: [transfer.card], sourceCard: this });
                }
              });
            }
          });
        }
      }
    }

    if (effect instanceof EndTurnEffect) {
      player.marker.removeMarker(this.LUSTER_ASSIST_MARKER, this);
    }

    return state;
  }
} 
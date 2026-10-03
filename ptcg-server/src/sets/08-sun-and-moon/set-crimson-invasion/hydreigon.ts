import { PokemonCard, Stage, CardType, PowerType, StoreLike, State, GameError, GameMessage, PlayerType, SlotType, ChoosePokemonPrompt, SuperType, Card, ChooseCardsPrompt, StateUtils, ConfirmPrompt } from '../../../game';
import { DiscardCardsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { DISCARD_X_ENERGY_FROM_THIS_POKEMON } from '../../../game/store/prefabs/costs';
import { ABILITY_USED, MOVE_CARDS, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class Hydreigon extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Zweilous';
  public cardType: CardType[] = [D];
  public hp: number = 160;
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -20 }];
  public retreat = [C, C];

  public powers = [{
    name: 'Weed Out',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may choose 3 of your Benched Pokémon. Then, discard your other Benched Pokémon.'
  }];

  public attacks = [{
    name: 'Dark Destruction',
    cost: [D, D, C],
    damage: 120,
    text: 'You may discard an Energy from this Pokémon. If you do, discard an Energy from your opponent\'s Active Pokémon.'
  }];

  public set: string = 'CIN';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '62';
  public name: string = 'Hydreigon';
  public fullName: string = 'Hydreigon CIN';

  public readonly WEED_OUT_MARKER = 'WEED_OUT_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.WEED_OUT_MARKER, this);

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.marker.hasMarker(this.WEED_OUT_MARKER, this)) { throw new GameError(GameMessage.POWER_ALREADY_USED); }

      const playerBench = player.bench.filter(c => c.cards.length > 0);

      if (playerBench.length <= 3) { throw new GameError(GameMessage.CANNOT_USE_POWER); }

      player.marker.addMarker(this.WEED_OUT_MARKER, this);
      ABILITY_USED(player, this);

      if (playerBench.length > 3) {
        store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_CARDS,
          PlayerType.BOTTOM_PLAYER,
          [SlotType.BENCH],
          { allowCancel: false, min: Math.min(playerBench.length, 3), max: 3 }
        ), targets => {
          if (!targets || targets.length === 0) {
            return;
          }

          player.forEachPokemon(PlayerType.BOTTOM_PLAYER, card => {
            if (card !== player.active && !targets.includes(card)) {
              card.clearEffects();
              MOVE_CARDS(store, state, card, player.discard);
            }
          });
        });
      }
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const activeCardList = opponent.active;
      const activePokemonCard = activeCardList.getPokemonCard();

      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_EFFECT_OF_ATTACK,
      ), wantToUse => {
        if (wantToUse) {

          DISCARD_X_ENERGY_FROM_THIS_POKEMON(store, state, effect, 1);

          let hasPokemonWithEnergy = false;

          if (activePokemonCard && activeCardList.cards.some(c => c.superType === SuperType.ENERGY)) {
            hasPokemonWithEnergy = true;
          }

          if (!hasPokemonWithEnergy) {
            return state;
          }

          let cards: Card[] = [];
          state = store.prompt(state, new ChooseCardsPrompt(
            player,
            GameMessage.CHOOSE_CARD_TO_DISCARD,
            opponent.active,
            { superType: SuperType.ENERGY },
            { min: 1, max: 1, allowCancel: false },
          ), selected => {
            cards = selected || [];
            const discardEnergy = new DiscardCardsEffect(effect, cards);
            return store.reduceEffect(state, discardEnergy);
          });

        }
      });

    }

    return state;
  }
}

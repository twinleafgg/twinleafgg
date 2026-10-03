import { PokemonCard, Stage, CardType, StoreLike, State, ConfirmPrompt, GameMessage, ChooseEnergyPrompt, Card } from "../../../game";
import { CheckProvidedEnergyEffect } from "../../../game/store/effects/check-effects";
import { Effect } from "../../../game/store/effects/effect";
import {WAS_ATTACK_USED, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";
import { OPPONENT_POKEMON_HAVE_NO_ABILITIES } from "../../../game/store/prefabs/effect-of-attack-prefabs";

export class Greninja extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom = 'Frogadier';
  public cardType: CardType[] = [W];
  public hp: number = 130;
  public weakness = [{ type: G }];
  public retreat = [];

  public attacks = [{
    name: 'Shadow Stitching',
    cost: [C],
    damage: 40,
    text: 'Until the end of your opponent\'s next turn, each Pokémon your opponent has in play, in his or her hand, and in his or her discard pile has no Abilities. (This includes cards that come into play on that turn.)'
  },
  {
    name: 'Moonlight Slash',
    cost: [W],
    damage: 60,
    text: ' You may return a [W] Energy from this Pokémon to your hand. If you do, this attack does 20 more damage.'
  }];

  public set: string = 'BKP';
  public setNumber = '40';
  public cardImage = 'assets/cardback.png';
  public name: string = 'Greninja';
  public fullName: string = 'Greninja BKP';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Shadow Stitching
    if (WAS_ATTACK_USED(effect, 0, this)) {
      return OPPONENT_POKEMON_HAVE_NO_ABILITIES(store, state, effect, this);
    }
    // Moonlight Slash
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;

      state = store.prompt(state, new ConfirmPrompt(
        effect.player.id,
        GameMessage.WANT_TO_USE_ABILITY,
      ), wantToUse => {
        if (wantToUse) {

          const checkProvidedEnergy = new CheckProvidedEnergyEffect(player);
          state = store.reduceEffect(state, checkProvidedEnergy);

          state = store.prompt(state, new ChooseEnergyPrompt(
            player.id,
            GameMessage.CHOOSE_ENERGIES_TO_DISCARD,
            checkProvidedEnergy.energyMap,
            [CardType.WATER],
            { allowCancel: false }
          ), energy => {
            const cards: Card[] = (energy || []).map(e => e.card);
            MOVE_CARDS(store, state, player.active, player.hand, { cards: cards, sourceCard: this });
            effect.damage += 20;
          });

        }
      });
    }

    return state;
  }
}

import { PokemonCard } from '../../../game/store/card/pokemon-card';
import {
  Stage,
  CardType,
  EnergyType,
  SuperType,
  CardTag,
} from '../../../game/store/card/card-types';
import {
  PowerType,
  StoreLike,
  State,
  StateUtils,
  GameMessage,
  PlayerType,
  SlotType,
  ConfirmPrompt,
  ShuffleDeckPrompt,
} from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { EvolveEffect } from '../../../game/store/effects/game-effects';
import { AttachEnergyPrompt } from '../../../game/store/prompts/attach-energy-prompt';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import {IS_ABILITY_BLOCKED,
  SHUFFLE_DECK,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Charizardex extends PokemonCard {
  public regulationMark = 'G';

  protected _tags = [CardTag.POKEMON_ex, CardTag.POKEMON_TERA];

  public stage: Stage = Stage.STAGE_2;

  public evolvesFrom = 'Charmeleon';

  public cardType: CardType[] = [CardType.DARK];

  public hp: number = 330;

  public weakness = [{ type: CardType.GRASS }];

  public retreat = [CardType.COLORLESS, CardType.COLORLESS];

  public powers = [
    {
      name: 'Infernal Reign',
      powerType: PowerType.ABILITY,
      text:
        'When you play this Pokémon from your hand to evolve ' +
        '1 of your Pokémon during your turn, you may search your ' +
        'deck for up to 3 Basic [R] Energy cards and attach them to ' +
        'your Pokémon in any way you like. Then, shuffle your deck. ',
    },
  ];

  public attacks = [
    {
      name: 'Burning Darkness',
      cost: [CardType.FIRE, CardType.FIRE],
      damage: 180,
      damageCalculation: '+',
      text: 'This attack does 30 more damage for each Prize card your ' + 'opponent has taken.',
    },
  ];

  public set: string = 'OBF';

  public cardImage: string = 'assets/cardback.png';

  public setNumber: string = '125';

  public name: string = 'Charizard ex';

  public fullName: string = 'Charizard ex OBF';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EvolveEffect && effect.pokemonCard === this) {
      const player = effect.player;

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }
      state = store.prompt(
        state,
        new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (wantToUse) {
            const player = effect.player;
            return store.prompt(
              state,
              new AttachEnergyPrompt(
                player.id,
                GameMessage.ATTACH_ENERGY_CARDS,
                player.deck,
                PlayerType.BOTTOM_PLAYER,
                [SlotType.BENCH, SlotType.ACTIVE],
                { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Fire Energy' },
                { allowCancel: false, min: 0, max: 3 },
              ),
              (transfers) => {
                transfers = transfers || [];
                // cancelled by user
                if (transfers.length === 0) {
                  SHUFFLE_DECK(store, state, player);
                  return state;
                }
                for (const transfer of transfers) {
                  const target = StateUtils.getTarget(state, player, transfer.to);
                  MOVE_CARDS(store, state, player.deck, target, { cards: [transfer.card], sourceCard: this });
                }
                state = store.prompt(state, new ShuffleDeckPrompt(player.id), (order) => {
                  player.deck.applyOrder(order);
                });
              },
            );
          }
          return state;
        },
      );
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const prizesTaken = 6 - opponent.getPrizeLeft();

      const damagePerPrize = 30;

      effect.damage = this.attacks[0].damage + prizesTaken * damagePerPrize;
    }

    if (
      effect instanceof PutDamageEffect &&
      effect.target.cards.includes(this) &&
      effect.target.getPokemonCard() === this
    ) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      // Target is not Active
      if (effect.target === player.active || effect.target === opponent.active) {
        return state;
      }

      effect.preventDefault = true;
    }
    return state;
  }
}

import {
  AttachEnergyPrompt,
  CardTag,
  CardTarget,
  CardType,
  ChoosePokemonPrompt,
  ConfirmPrompt,
  EnergyType,
  GameMessage,
  PlayerType,
  PokemonCard,
  PowerType,
  ShuffleDeckPrompt,
  SlotType,
  Stage,
  State,
  StateUtils,
  StoreLike,
  SuperType,
} from '../../../game';
import { PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { EvolveEffect } from '../../../game/store/effects/game-effects';
import {IS_ABILITY_BLOCKED,
  SHUFFLE_DECK,
  WAS_ATTACK_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class MarniesGrimmsnarlex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = "Marnie's Morgrem";
  protected _tags = [CardTag.MARNIES, CardTag.POKEMON_ex];
  public cardType: CardType[] = [D];
  public hp: number = 320;
  public weakness = [{ type: G }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Punk Up',
      powerType: PowerType.ABILITY,
      text:
        'When you play this Pokémon from your hand to evolve 1 of your Pokémon during your turn, ' +
        "you may search your deck for up to 5 Basic [D] Energy cards and attach them to your Marnie's " +
        'Pokémon in any way you like. Then, shuffle your deck.',
    },
  ];

  public attacks = [
    {
      name: 'Shadow Bullet',
      cost: [D, D],
      damage: 180,
      text: "This attack also does 30 damage to 1 of your opponent's Benched Pokémon. (Don't apply Weakness and Resistance for Benched Pokémon.)",
    },
  ];

  public regulationMark: string = 'I';
  public set: string = 'DRI';
  public setNumber: string = '136';
  public cardImage: string = 'assets/cardback.png';
  public name: string = "Marnie's Grimmsnarl ex";
  public fullName: string = "Marnie's Grimmsnarl ex DRI";

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (effect instanceof EvolveEffect && effect.pokemonCard === this) {
      const player = effect.player;

      if (player.deck.cards.length === 0) {
        return state;
      }

      // Try to reduce PowerEffect, to check if something is blocking our ability
      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        return state;
      }
      const blockedTo: CardTarget[] = [];
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card, target) => {
        if (!card.hasTag(CardTag.MARNIES)) blockedTo.push(target);
      });
      state = store.prompt(
        state,
        new ConfirmPrompt(effect.player.id, GameMessage.WANT_TO_USE_ABILITY),
        (wantToUse) => {
          if (wantToUse) {
            return store.prompt(
              state,
              new AttachEnergyPrompt(
                player.id,
                GameMessage.ATTACH_ENERGY_CARDS,
                player.deck,
                PlayerType.BOTTOM_PLAYER,
                [SlotType.BENCH, SlotType.ACTIVE],
                {
                  superType: SuperType.ENERGY,
                  energyType: EnergyType.BASIC,
                  name: 'Darkness Energy',
                },
                { allowCancel: true, min: 0, max: 5, blockedTo },
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
      return state;
    }

    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const hasBenched = opponent.bench.some((b) => b.cards.length > 0);
      if (!hasBenched) {
        return state;
      }

      state = store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { allowCancel: false },
        ),
        (targets) => {
          if (!targets || targets.length === 0) {
            return;
          }
          const damageEffect = new PutDamageEffect(effect, 30);
          damageEffect.target = targets[0];
          store.reduceEffect(state, damageEffect);
        },
      );

      return state;
    }
    return state;
  }
}

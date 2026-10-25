import { PokemonCard, Stage, CardType, CardTag, PowerType, StoreLike, State, GameMessage, StateUtils, ChoosePokemonPrompt, PlayerType, SlotType } from '../../game';
import { AfterDamageEffect } from '../../game/store/effects/attack-effects';
import { Effect } from '../../game/store/effects/effect';
import { PowerEffect } from '../../game/store/effects/game-effects';
import { PlayPokemonEffect } from '../../game/store/effects/play-card-effects';
import { CONFIRMATION_PROMPT, IS_POKEPOWER_BLOCKED, MOVE_CARD_TO, WAS_ATTACK_USED } from '../../game/store/prefabs/prefabs';

export class UmbreonStar extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.STAR];
  public hp: number = 70;
  public cardType: CardType[] = [D];
  public weakness = [{ type: F }];
  public resistance = [{ type: P, value: -30 }];
  public retreat = [C];

  public powers = [
    {
      // Dark Ray
      name: 'Dark Ray',
      powerType: PowerType.POKEPOWER,
      text: "Once during your turn, when you put Umbreon Star from your hand onto your Bench, you may choose 1 card from your opponent's hand without looking and discard it.",
    },
  ];
  // THE SHRED ISN'T SHREDDING
  public attacks = [
    {
      // Feint Attack
      name: 'Feint Attack',
      cost: [D, D],
      damage: 0,
      shredAttack: true,
      text: "Choose 1 of your opponent's Pokémon. This attack does 30 damage to that Pokémon. This attack's damage isn't affected by Weakness, Resistance, Poké-Powers, Poké-Bodies, or any other effects on that Pokémon.",
    },
  ];

  public set: string = 'P5';
  public setNumber: string = '17';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Umbreon Star';
  public fullName: string = 'Umbreon Star P5';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (
      effect instanceof PlayPokemonEffect &&
      effect.pokemonCard === this &&
      !IS_POKEPOWER_BLOCKED(store, state, effect.player, this)
    ) {
      CONFIRMATION_PROMPT(
        store,
        state,
        effect.player,
        (wantToUse) => {
          if (wantToUse) {
            const player = effect.player;
            const opponent = StateUtils.getOpponent(state, player);
            const powerEffect = new PowerEffect(player, this.powers[0], this);
            store.reduceEffect(state, powerEffect);
            if (opponent.hand.cards.length > 0) {
              const randomIndex = Math.floor(Math.random() * opponent.hand.cards.length);
              const randomCard = opponent.hand.cards[randomIndex];
              MOVE_CARD_TO(state, randomCard, opponent.discard);
            }
          }
        },
        GameMessage.WANT_TO_USE_ABILITY,
      );
    }
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      const targets = opponent.getPokemonInPlay();
      if (targets.length === 0) return state;
      return store.prompt(
        state,
        new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH, SlotType.ACTIVE],
        ),
        (selected) => {
          const target = selected[0];
          target.damage += 30;
          const afterDamage = new AfterDamageEffect(effect, 30);
          state = store.reduceEffect(state, afterDamage);
        },
      );
    }
    return state;
  }
}

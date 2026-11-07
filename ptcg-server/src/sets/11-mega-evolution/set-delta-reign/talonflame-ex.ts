import { PokemonCard, Stage, CardTag, CardType, PowerType, StoreLike, State, Player, PlayerType, GameError, GameMessage } from "../../../game";
import { CheckPokemonTypeEffect } from "../../../game/store/effects/check-effects";
import { Effect } from "../../../game/store/effects/effect";
import { WAS_POWER_USED, IS_ABILITY_BLOCKED, PLAY_POKEMON_FROM_HAND_TO_BENCH, WAS_ATTACK_USED, SEARCH_DECK_FOR_CARDS_TO_HAND } from "../../../game/store/prefabs/prefabs";

export class Talonflameex extends PokemonCard {
  public stage: Stage = Stage.STAGE_2;
  public evolvesFrom: string = 'Fletchinder';
  protected _tags = [CardTag.POKEMON_ex];
  public cardType: CardType[] = [C];
  public hp: number = 280;
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -30 }];
  public retreat = [];

  public powers = [{
      name: 'Excited Dive',
      powerType: PowerType.ABILITY,
      useFromHand: true,
      useFromHandToBench: true,
      text: 'Once during your turn, if this Pokémon is in your hand, and if you have any [C] Mega Evolution Pokémon ex in play, you may use this Ability. Put this Pokémon onto your Bench.',
    }];

  public attacks = [{
      name: 'Talon Hunt',
      cost: [C, C],
      damage: 150,
      text: 'You may search your deck for up to 2 cards and put them into your hand. Then, shuffle your deck.',
    }];

  public regulationMark: string = 'J';
  public set: string = 'DLR';
  public setNumber: string = '62';
  public cardImage: string = 'assets/cardback.png';
  public name: string = 'Talonflame ex';
  public fullName: string = 'Talonflame ex M6';

  public canUseFromHandToBench(store: StoreLike, state: State, player: Player): boolean {
    let hasColorlessMega = false;
    player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
      const pokemonCard = cardList.getPokemonCard();
      if (!pokemonCard || !pokemonCard.hasTag(CardTag.POKEMON_SV_MEGA)) {
        return;
      }

      const checkType = new CheckPokemonTypeEffect(cardList);
      store.reduceEffect(state, checkType);
      if (checkType.cardTypes.includes(CardType.COLORLESS)) {
        hasColorlessMega = true;
      }
    });
    return hasColorlessMega;
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Ref: set-paldea-evolved/luxray.ts (useFromHand bench), set-steam-siege/clawitzer.ts (Mega in play check)
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      if (!this.canUseFromHandToBench(store, state, player)) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      PLAY_POKEMON_FROM_HAND_TO_BENCH(state, player, this, effect.target);
    }

    // Ref: set-evolving-skies/victini.ts (Victory Dive)
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      SEARCH_DECK_FOR_CARDS_TO_HAND(
        store,
        state,
        player,
        this,
        {},
        { min: 0, max: 2, allowCancel: false },
      );
    }

    return state;
  }
}

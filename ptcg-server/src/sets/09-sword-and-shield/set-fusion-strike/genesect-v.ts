import { PokemonCard, CardTag, Stage, CardType, PowerType, StoreLike, State, GameError, GameMessage, PlayerType, BoardEffect } from "../../../game";
import { Effect } from "../../../game/store/effects/effect";
import { EndTurnEffect } from "../../../game/store/effects/game-phase-effects";
import { PlayPokemonEffect } from "../../../game/store/effects/play-card-effects";
import {WAS_ATTACK_USED, THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN, WAS_POWER_USED, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class GenesectV extends PokemonCard {
  protected _tags = [CardTag.POKEMON_V, CardTag.FUSION_STRIKE];
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [M];
  public hp: number = 190;
  public weakness = [{ type: R }];
  public retreat = [C, C];

  public powers = [
    {
      name: 'Fusion Strike System',
      useWhenInPlay: true,
      powerType: PowerType.ABILITY,
      text:
        'Once during your turn, you may draw cards until you have ' +
        'as many cards in your hand as you have Fusion Strike ' +
        'Pokémon in play.',
    },
  ];

  public attacks = [
    {
      name: 'Techno Blast',
      cost: [M, M, C],
      damage: 210,
      text: "During your next turn, this Pokémon can't attack.",
    },
  ];

  public regulationMark = 'E';
  public set: string = 'FST';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '185';
  public name: string = 'Genesect V';
  public fullName: string = 'Genesect V FST';

  public readonly FUSION_STRIKE_SYSTEM_MARKER = 'FUSION_STRIKE_SYSTEM_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Techno Blast
    if (WAS_ATTACK_USED(effect, 0, this)) {
      THIS_POKEMON_CANNOT_ATTACK_NEXT_TURN(effect.player);
    }

    if (effect instanceof PlayPokemonEffect && effect.pokemonCard === this) {
      const player = effect.player;
      player.marker.removeMarker(this.FUSION_STRIKE_SYSTEM_MARKER, this);
    }

    if (
      effect instanceof EndTurnEffect &&
      effect.player.marker.hasMarker(this.FUSION_STRIKE_SYSTEM_MARKER, this)
    ) {
      const player = effect.player;
      player.marker.removeMarker(this.FUSION_STRIKE_SYSTEM_MARKER, this);
    }

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (player.marker.hasMarker(this.FUSION_STRIKE_SYSTEM_MARKER, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      let fusionStrikeCount = 0;

      if (player.active?.getPokemonCard()?.hasTag(CardTag.FUSION_STRIKE)) {
        fusionStrikeCount++;
      }

      player.bench.forEach((benchSpot) => {
        if (benchSpot.getPokemonCard()?.hasTag(CardTag.FUSION_STRIKE)) {
          fusionStrikeCount++;
        }
      });

      while (player.hand.cards.length < fusionStrikeCount) {
        if (player.deck.cards.length === 0) {
          break;
        }
        MOVE_CARDS(store, state, player.deck, player.hand, { count: 1, sourceCard: this });

        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList) => {
          if (cardList.getPokemonCard() === this) {
            cardList.addBoardEffect(BoardEffect.ABILITY_USED);
          }
        });
      }
      player.marker.addMarker(this.FUSION_STRIKE_SYSTEM_MARKER, this);
    }

    return state;
  }
}

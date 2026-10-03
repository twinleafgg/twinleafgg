import { Attack, CardType, ChooseCardsPrompt, GameError, GameLog, GameMessage, PokemonCard, PokemonCardList, Power, PowerType, Stage, State, StateUtils, StoreLike, SuperType, Weakness } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import {WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Ditto extends PokemonCard {

  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public hp: number = 70;
  public weakness: Weakness[] = [{ type: F }];
  public retreat: CardType[] = [C];

  public powers: Power[] = [{
    name: 'Transform',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'During your turn (before your attack), you may put a Basic Pokémon from your hand on top of this Pokémon. ' +
      '(This does not count as playing that Pokémon or evolving.) This Pokémon is now that Pokémon. ' +
      '(Any cards attached to this Pokémon, damage counters, Special Conditions, turns in play, and any other effects ' +
      'remain on the new Pokémon.)',
  }];
  public attacks: Attack[] = [];

  public set: string = 'BCR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '108';
  public name: string = 'Ditto';
  public fullName: string = 'Ditto BCR';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const targetCardList = StateUtils.findCardList(state, this);
      if (!(targetCardList instanceof PokemonCardList)) {
        throw new GameError(GameMessage.INVALID_TARGET);
      }
      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
        player.hand,
        { superType: SuperType.POKEMON, stage: Stage.BASIC },
        { min: 1, max: 1, allowCancel: false },
      ), (selection) => {
        if (selection.length <= 0) {
          throw new GameError(GameMessage.INVALID_TARGET);
        }

        const pokemonCard = selection[0];

        if (!(pokemonCard instanceof PokemonCard)) {
          throw new GameError(GameMessage.INVALID_TARGET);
        }
        store.log(state, GameLog.LOG_PLAYER_TRANSFORMS_INTO_POKEMON, {
          name: player.name,
          pokemon: this.name,
          card: pokemonCard.name,
          effect: effect.power.name,
        });
        MOVE_CARDS(store, state, player.hand, targetCardList, { cards: [pokemonCard], sourceCard: this });
      });
    }

    return state;
  }
}
import { TrainerCard } from '../../../game';
import { TrainerType } from '../../../game';
import { Stage } from '../../../game';
import { CardType } from '../../../game';
import { PokemonType } from '../../../game';
import { GameError } from '../../../game';
import { GameLog } from '../../../game';
import { GameMessage } from '../../../game';
import { Player } from '../../../game';
import { PokemonCard } from '../../../game';
import { PokemonCardList } from '../../../game';
import { Power } from '../../../game';
import { PowerType } from '../../../game';
import { State } from '../../../game';
import { StateUtils } from '../../../game';
import { StoreLike } from '../../../game';
import { AddSpecialConditionsEffect } from '../../../game/store/effects/attack-effects';
import { Effect } from '../../../game/store/effects/effect';
import { RetreatEffect } from '../../../game/store/effects/game-effects';
import { PlayItemEffect } from '../../../game/store/effects/play-card-effects';
import { PlayPokemonEffect } from '../../../game/store/effects/play-card-effects';
import { MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_POWER_USED } from '../../../game/store/prefabs/prefabs';

export class SkullFossil extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  public stage: Stage = Stage.BASIC;
  public cardType: CardType[] = [C];
  public cardTypez: CardType = CardType.COLORLESS;
  public movedToActiveThisTurn = false;
  public pokemonType = PokemonType.NORMAL;
  public evolvesFrom = '';
  public cardTag = [];
  public tools = [];
  public evolvesTo = ['Cranidos'];
  public evolvesToStage = [];
  public archetype = [];
  public hp: number = 50;
  public weakness = [];
  public retreat = [];
  public resistance = [];
  public attacks = [];
  public maxTools: number = 1;
  public evolvesFromBase: string[] = [];

  public powers: Power[] = [{
    // Skull Fossil
    name: 'Skull Fossil',
    text: 'Play Skull Fossil as if it were a Colorless Basic Pokémon. (Skull Fossil counts as a Trainer card as well, but if Skull Fossil is Knocked Out, this counts as a Knocked Out Pokémon.) Skull Fossil can\'t be affected by any Special Conditions and can\'t retreat. At any time during your turn before your attack, you may discard Skull Fossil from play. (This doesn\'t count as a Knocked Out Pokémon.)',
    useWhenInPlay: true,
    exemptFromAbilityLock: true,
    isFossil: true,
    powerType: PowerType.TRAINER_ABILITY
  }];

  public set: string = 'MT';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '117';
  public name: string = 'Skull Fossil';
  public fullName: string = 'Skull Fossil MT';
  public text: string = 'Play Skull Fossil as if it were a Colorless Basic Pokémon. (Skull Fossil counts as a Trainer card as well, but if Skull Fossil is Knocked Out, this counts as a Knocked Out Pokémon.) Skull Fossil can\'t be affected by any Special Conditions and can\'t retreat. At any time during your turn before your attack, you may discard Skull Fossil from play. (This doesn\'t count as a Knocked Out Pokémon.)';

  public canPlay(_store: StoreLike, _state: State, player: Player): boolean {
    return player.bench.some(b => b.cards.length === 0);
  }

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_POWER_USED(effect, 0, this as unknown as PokemonCard)) {
      const player = effect.player;
      store.log(state, GameLog.LOG_PLAYER_DISCARDS_CARD, {
        name: player.name,
        card: this.name,
        effect: this.powers[0].name
      });
      const cardList = StateUtils.findCardList(state, this);
      if (cardList instanceof PokemonCardList && player.active === cardList && player.bench.some(b => b.cards.length > 0)) {
        player.switchPokemon(cardList);
      }
      MOVE_CARDS(store, state, cardList, player.discard, { sourceCard: this });
    }

    if (effect instanceof PlayItemEffect && effect.trainerCard === this) {
      const player = effect.player;
      const emptySlots = player.bench.filter(b => b.cards.length === 0);
      if (emptySlots.length === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }
      const playPokemonEffect = new PlayPokemonEffect(player, this as unknown as PokemonCard, emptySlots[0]);
      store.reduceEffect(state, playPokemonEffect);
    }

    if (effect instanceof AddSpecialConditionsEffect && effect.target.getPokemonCard() === this) {
      effect.preventDefault = true;
    }

    if (effect instanceof RetreatEffect && effect.player.active.getPokemonCard() === this) {
      throw new GameError(GameMessage.CANNOT_RETREAT);
    }

    return state;
  }
}

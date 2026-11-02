import { Attack, CardTarget, ChoosePokemonPrompt, GameError, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { CardTag, TrainerType } from '../../../game/store/card/card-types';
import { TrainerCard } from '../../../game/store/card/trainer-card';
import { CheckPokemonAttacksEffect, CheckProvidedEnergyEffect, CheckTableStateEffect } from '../../../game/store/effects/check-effects';
import { Effect } from '../../../game/store/effects/effect';
import { AttackEffect } from '../../../game/store/effects/game-effects';
import { DAMAGE_OPPONENT_POKEMON, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';
import { WAS_TRAINER_USED } from '../../../game/store/prefabs/trainer-prefabs';

export class TeamGalacticsInventionG107TechnicalMachineG extends TrainerCard {
  protected _trainerType: TrainerType = TrainerType.ITEM;
  protected _tags = [CardTag.TECHNICAL_MACHINE];
  public set: string = 'RR';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '95';
  public name: string = 'Team Galactic\'s Invention G-107 Technical Machine G';
  public fullName: string = 'Team Galactic\'s Invention G-107 Technical Machine G RR';

  public attacks: Attack[] = [{
    name: 'Damage Porter',
    cost: [C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 10 damage times the amount of Energy attached to that Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public text: string = 'Attach this card to 1 of your Pokémon SP in play. That Pokémon may use this card\'s attack instead of its own. When the Pokémon this card is attached to is no longer Pokémon SP, discard this card.';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    if (WAS_TRAINER_USED(effect, this)) {
      const player = effect.player;
      const blocked: CardTarget[] = [];
      let eligibleCount = 0;

      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (_cardList, card, target) => {
        if (!card.hasTag(CardTag.POKEMON_SP)) {
          blocked.push(target);
        } else {
          eligibleCount += 1;
        }
      });

      if (eligibleCount === 0) {
        throw new GameError(GameMessage.CANNOT_PLAY_THIS_CARD);
      }

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_ATTACH_CARDS,
        PlayerType.BOTTOM_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false, blocked }
      ), transfers => {
        MOVE_CARDS(store, state, player.supporter, transfers[0], { cards: [effect.trainerCard], sourceCard: this });
      });
    }

    if (effect instanceof CheckPokemonAttacksEffect && effect.player.active.cards.includes(this) && !effect.attacks.includes(this.attacks[0])) {
      effect.attacks.push(this.attacks[0]);
    }

    if (effect instanceof AttackEffect && effect.attack === this.attacks[0]) {
      const player = effect.player;

      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), targets => {
        if (!targets || targets.length === 0) {
          return;
        }
        const target = targets[0];
        const owner = StateUtils.findOwner(state, target);
        const checkEnergy = new CheckProvidedEnergyEffect(owner, target);
        store.reduceEffect(state, checkEnergy);
        const energyCount = checkEnergy.energyMap.reduce((sum, e) => sum + e.provides.length, 0);
        DAMAGE_OPPONENT_POKEMON(store, state, effect, 10 * energyCount, [target]);
      });
    }

    if (effect instanceof CheckTableStateEffect) {
      state.players.forEach(player => {
        player.forEachPokemon(PlayerType.BOTTOM_PLAYER, cardList => {
          if (!cardList.cards.includes(this)) {
            return;
          }
          const attachedTo = cardList.getPokemonCard();
          if (!attachedTo || !attachedTo.hasTag(CardTag.POKEMON_SP)) {
            MOVE_CARDS(store, state, cardList, player.discard, { cards: [this], sourceCard: this });
          }
        });
      });
    }

    return state;
  }
}

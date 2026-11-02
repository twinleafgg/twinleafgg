import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardTag, CardType, Stage, SuperType, TrainerType } from '../../../game/store/card/card-types';
import { ChooseCardsPrompt, ChoosePokemonPrompt, GameMessage, PlayerType, SlotType, State, StateUtils, StoreLike, TrainerCard } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { DealDamageEffect, PutDamageEffect } from '../../../game/store/effects/attack-effects';
import { MOVE_CARDS, SHOW_CARDS_TO_PLAYER, SHUFFLE_DECK, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class HonchkrowG extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  protected _tags = [CardTag.POKEMON_SP];
  public hp: number = 80;
  public cardType: CardType[] = [D];
  public weakness = [{ type: L }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Honcho\'s Command',
    cost: [],
    damage: 0,
    text: 'Search your deck for up to 2 in any combination of Stadium cards or Trainer cards that has Team Galactic\'s Invention in its name, show them to your opponent, and put them into your hand. Shuffle your deck afterward.'
  }, {
    name: 'Target Attack',
    cost: [D, C],
    damage: 0,
    text: 'Choose 1 of your opponent\'s Pokémon. This attack does 20 damage to that Pokémon. If that Pokémon already has any damage counters on it, this attack does 20 damage plus 20 more damage. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public set: string = 'PL';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '77';
  public name: string = 'Honchkrow G';
  public fullName: string = 'Honchkrow G PL';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Honcho's Command
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      if (player.deck.cards.length === 0) {
        return state;
      }

      const blocked: number[] = [];
      player.deck.cards.forEach((card, index) => {
        const isStadium = card instanceof TrainerCard && card.trainerType === TrainerType.STADIUM;
        const isGalacticInvention = card.superType === SuperType.TRAINER && card.name.includes('Team Galactic\'s Invention');
        if (!isStadium && !isGalacticInvention) {
          blocked.push(index);
        }
      });

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_HAND,
        player.deck,
        { superType: SuperType.TRAINER },
        { min: 0, max: 2, allowCancel: true, blocked }
      ), selected => {
        const cards = selected || [];
        SHOW_CARDS_TO_PLAYER(store, state, opponent, cards);
        MOVE_CARDS(store, state, player.deck, player.hand, { cards, sourceCard: this, sourceEffect: this.attacks[0] });
        SHUFFLE_DECK(store, state, player);
      });
    }

    // Target Attack
    if (WAS_ATTACK_USED(effect, 1, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      return store.prompt(state, new ChoosePokemonPrompt(
        player.id,
        GameMessage.CHOOSE_POKEMON_TO_DAMAGE,
        PlayerType.TOP_PLAYER,
        [SlotType.ACTIVE, SlotType.BENCH],
        { min: 1, max: 1, allowCancel: false }
      ), selected => {
        const target = selected[0];
        const damage = target.damage > 0 ? 40 : 20;
        const damageEffect = target === opponent.active
          ? new DealDamageEffect(effect, damage)
          : new PutDamageEffect(effect, damage);
        damageEffect.target = target;
        store.reduceEffect(state, damageEffect);
      });
    }

    return state;
  }
}

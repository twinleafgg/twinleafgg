import { PokemonCard, Stage, CardType, PowerType, StoreLike, State, GameError, GameMessage, PlayerType, EnergyCard, EnergyType, StateUtils, PokemonCardList, ChooseCardsPrompt, SuperType } from "../../../game";
import { DealDamageEffect, PutDamageEffect } from "../../../game/store/effects/attack-effects";
import { Effect } from "../../../game/store/effects/effect";
import {WAS_POWER_USED, IS_ABILITY_BLOCKED, USE_ABILITY_ONCE_PER_TURN, ABILITY_USED, REMOVE_MARKER_AT_END_OF_TURN, WAS_ATTACK_USED, MOVE_CARDS } from "../../../game/store/prefabs/prefabs";

export class Articuno extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 120;
  public cardType: CardType[] = [W];
  public weakness = [{ type: M }];
  public retreat = [C];

  public powers = [{
    name: 'Frosty Flapping',
    powerType: PowerType.ABILITY,
    useWhenInPlay: true,
    text: 'Once during your turn, if you have Moltres and Zapdos in play, you may use this Ability. Attach a Basic [W] Energy card from your hand to this Pokémon.'
  }];

  public attacks = [{
    name: 'Hail',
    cost: [W, W, C],
    damage: 0,
    text: 'This attack does 30 damage to each of your opponent\'s Pokémon. (Don\'t apply Weakness and Resistance for Benched Pokémon.)'
  }];

  public regulationMark: string = 'J';
  public set: string = '30C';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '18';
  public name: string = 'Articuno';
  public fullName: string = 'Articuno 30C';

  public readonly FROSTY_FLAPPING_MARKER = 'FROSTY_FLAPPING_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Frosty Flapping
    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;

      if (IS_ABILITY_BLOCKED(store, state, player, this)) {
        throw new GameError(GameMessage.BLOCKED_BY_EFFECT);
      }

      let hasMoltres = false;
      let hasZapdos = false;
      player.forEachPokemon(PlayerType.BOTTOM_PLAYER, (cardList, card) => {
        if (cardList.getPokemonCard() !== card) {
          return;
        }
        if (card.name === 'Moltres') {
          hasMoltres = true;
        }
        if (card.name === 'Zapdos') {
          hasZapdos = true;
        }
      });

      if (!hasMoltres || !hasZapdos) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      const hasEnergyInHand = player.hand.cards.some(c =>
        c instanceof EnergyCard
        && c.energyType === EnergyType.BASIC
        && c.provides.includes(CardType.WATER)
      );
      if (!hasEnergyInHand) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }

      USE_ABILITY_ONCE_PER_TURN(player, this.FROSTY_FLAPPING_MARKER, this);
      ABILITY_USED(player, this);

      const cardList = StateUtils.findCardList(state, this) as PokemonCardList;

      return store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_ATTACH,
        player.hand,
        { superType: SuperType.ENERGY, energyType: EnergyType.BASIC, name: 'Water Energy' },
        { min: 1, max: 1, allowCancel: false }
      ), cards => {
        if (cards && cards.length > 0) {
          MOVE_CARDS(store, state, player.hand, cardList, { cards: cards, sourceCard: this });
        }
      });
    }

    REMOVE_MARKER_AT_END_OF_TURN(effect, this.FROSTY_FLAPPING_MARKER, this);

    // Hail
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const opponent = StateUtils.getOpponent(state, effect.player);

      const damageActive = new DealDamageEffect(effect, 30);
      damageActive.target = opponent.active;
      store.reduceEffect(state, damageActive);

      opponent.bench.forEach(benched => {
        if (benched.cards.length > 0) {
          const damage = new PutDamageEffect(effect, 30);
          damage.target = benched;
          store.reduceEffect(state, damage);
        }
      });
    }

    return state;
  }
}

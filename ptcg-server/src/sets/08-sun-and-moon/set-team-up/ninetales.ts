import { CardType, PokemonCard, Stage, StoreLike, State, StateUtils, GameMessage, PlayerType, SlotType, EnergyCard, GameError, ChooseCardsPrompt, SuperType } from '../../../game';
import { PowerType } from '../../../game';
import { EffectOfAbilityEffect } from '../../../game/store/effects/game-effects';
import { Attack } from '../../../game/store/card/pokemon-types';
import { Effect } from '../../../game/store/effects/effect';
import { ChoosePokemonPrompt } from '../../../game/store/prompts/choose-pokemon-prompt';
import {ABILITY_USED, ADD_MARKER, HAS_MARKER, WAS_POWER_USED, MOVE_CARDS } from '../../../game/store/prefabs/prefabs';

export class Ninetales extends PokemonCard {

  public stage = Stage.STAGE_1;
  public evolvesFrom = 'Vulpix';
  public cardType: CardType[] = [R];
  public hp = 100;
  public weakness = [{ type: W }];
  public retreat = [C];

  public powers = [{
    name: 'Nine Temptations',
    useWhenInPlay: true,
    powerType: PowerType.ABILITY,
    text: 'Once during your turn (before your attack), you may discard 2 [R] Energy cards from your hand. If you do, switch 1 of your opponent\'s Benched Pokémon with their Active Pokémon.'
  }];

  public attacks: Attack[] = [
    {
      name: 'Flame Tail',
      cost: [R, C, C],
      damage: 90,
      text: ''
    },
  ];

  public set = 'TEU';
  public setNumber: string = '16';
  public cardImage: string = 'assets/cardback.png';
  public name = 'Ninetales';
  public fullName = 'Ninetales TEU';

  public readonly NINE_TEMPTATIONS_MARKER = 'NINE_TEMPTATIONS_MARKER';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {

    if (WAS_POWER_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);

      const fireEnergyCount = player.hand.cards.filter(c => {
        return c instanceof EnergyCard && c.name === 'Fire Energy';
      }).length;

      if (fireEnergyCount < 2) {
        throw new GameError(GameMessage.CANNOT_USE_POWER);
      }
      if (HAS_MARKER(this.NINE_TEMPTATIONS_MARKER, player, this)) {
        throw new GameError(GameMessage.POWER_ALREADY_USED);
      }

      state = store.prompt(state, new ChooseCardsPrompt(
        player,
        GameMessage.CHOOSE_CARD_TO_DISCARD,
        player.hand,
        { superType: SuperType.ENERGY, name: 'Fire Energy' },
        { allowCancel: true, min: 2, max: 2 }
      ), cards => {
        cards = cards || [];

        if (cards.length === 0) {
          return state;
        }

        const hasBench = opponent.bench.some(b => b.cards.length > 0);
        if (!hasBench) {
          return state;
        }

        store.prompt(state, new ChoosePokemonPrompt(
          player.id,
          GameMessage.CHOOSE_POKEMON_TO_SWITCH,
          PlayerType.TOP_PLAYER,
          [SlotType.BENCH],
          { allowCancel: false }
        ), result => {
          const cardList = result[0];
          const gustEffect = new EffectOfAbilityEffect(player, this.powers[0], this, cardList);
          store.reduceEffect(state, gustEffect);

          if (gustEffect.target) {
            opponent.switchPokemon(gustEffect.target);
          }
        });

        ADD_MARKER(this.NINE_TEMPTATIONS_MARKER, player, this);
        ABILITY_USED(player, this);

        MOVE_CARDS(store, state, player.hand, player.discard, { cards: cards, sourceCard: this });
      });
    }
    return state;
  }

}

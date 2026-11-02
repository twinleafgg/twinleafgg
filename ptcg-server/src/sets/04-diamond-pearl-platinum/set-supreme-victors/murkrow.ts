import { PokemonCard } from '../../../game/store/card/pokemon-card';
import { CardType, Stage } from '../../../game/store/card/card-types';
import { CardTarget, ChoosePokemonPrompt, GameMessage, PlayerType, PokemonCardList, SlotType, State, StateUtils, StoreLike } from '../../../game';
import { Effect } from '../../../game/store/effects/effect';
import { MOVE_CARDS, WAS_ATTACK_USED } from '../../../game/store/prefabs/prefabs';

export class Murkrow extends PokemonCard {
  public stage: Stage = Stage.BASIC;
  public hp: number = 70;
  public cardType: CardType[] = [D];
  public weakness = [{ type: L, value: +10 }];
  public resistance = [{ type: F, value: -20 }];
  public retreat = [C];

  public attacks = [{
    name: 'Switcheroo',
    cost: [],
    damage: 0,
    text: 'Move a Pokémon Tool card attached to 1 of your opponent\'s Pokémon to another of your opponent\'s Pokémon (excluding Pokémon that already has a Pokémon Tool attached to it). (If an effect of this attack is prevented, this attack does nothing.)'
  }, {
    name: 'Flap',
    cost: [D, C],
    damage: 20,
    text: ''
  }];

  public set: string = 'SV';
  public cardImage: string = 'assets/cardback.png';
  public setNumber: string = '72';
  public name: string = 'Murkrow';
  public fullName: string = 'Murkrow SV';

  public reduceEffect(store: StoreLike, state: State, effect: Effect): State {
    // Switcheroo
    if (WAS_ATTACK_USED(effect, 0, this)) {
      const player = effect.player;
      const opponent = StateUtils.getOpponent(state, player);
      let toolCount = 0;
      let noToolCount = 0;
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, cardList => {
      if (cardList.tools.length > 0) {
      toolCount++;
      } else {
      noToolCount++;
      }
      });
      if (toolCount === 0 || noToolCount === 0) {
      return state;
      }
      const blockedSources: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, _card, target) => {
      if (cardList.tools.length === 0) {
      blockedSources.push(target);
      }
      });
      return store.prompt(state, new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON,
      PlayerType.TOP_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { min: 1, max: 1, allowCancel: false, blocked: blockedSources }
      ), sourceTargets => {
      if (!sourceTargets || sourceTargets.length === 0) {
      return;
      }
      const source = sourceTargets[0];
      const tool = source.tools[0];
      const blockedDest: CardTarget[] = [];
      opponent.forEachPokemon(PlayerType.TOP_PLAYER, (cardList, _card, target) => {
      if (cardList.tools.length > 0 || cardList === source) {
      blockedDest.push(target);
      }
      });
      store.prompt(state, new ChoosePokemonPrompt(
      player.id,
      GameMessage.CHOOSE_POKEMON,
      PlayerType.TOP_PLAYER,
      [SlotType.ACTIVE, SlotType.BENCH],
      { min: 1, max: 1, allowCancel: false, blocked: blockedDest }
      ), destTargets => {
      if (!destTargets || destTargets.length === 0) {
      return;
      }
      const dest = destTargets[0] as PokemonCardList;
      const toolIdx = source.tools.indexOf(tool);
      if (toolIdx !== -1) {
      source.tools.splice(toolIdx, 1);
      }
      MOVE_CARDS(store, state, source, dest, { cards: [tool], sourceCard: this });
      const cardIdx = dest.cards.indexOf(tool);
      if (cardIdx !== -1) {
      dest.cards.splice(cardIdx, 1);
      }
      dest.tools.push(tool);
      });
      });
    }

    return state;
  }
}

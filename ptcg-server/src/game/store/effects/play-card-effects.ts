import { Effect } from './effect';
import { EnergyCard } from '../card/energy-card';
import { Player } from '../state/player';
import { PokemonCard } from '../card/pokemon-card';
import { PokemonCardList } from '../state/pokemon-card-list';
import { TrainerCard } from '../card/trainer-card';
import { CardList } from '../state/card-list';
import { Card } from '../card/card';
import { Stage } from '../card/card-types';
import { SlotType } from '../actions/play-card-action';

export enum PlayCardEffects {
  ATTACH_ENERGY_EFFECT = 'ATTACH_ENERGY_EFFECT',
  PLAY_POKEMON_EFFECT = 'PLAY_POKEMON_EFFECT',
  PLAY_POKEMON_FROM_DECK_EFFECT = 'PLAY_POKEMON_FROM_DECK_EFFECT',
  PLAY_POKEMON_FROM_DISCARD_EFFECT = 'PLAY_POKEMON_FROM_DISCARD_EFFECT',
  PLAY_SUPPORTER_EFFECT = 'PLAY_SUPPORTER_EFFECT',
  PLAY_STADIUM_EFFECT = 'PLAY_STADIUM_EFFECT',
  PLAY_POKEMON_TOOL_EFFECT = 'PLAY_POKEMON_TOOL_EFFECT',
  PLAY_ITEM_EFFECT = 'PLAY_ITEM_EFFECT',
  TRAINER_EFFECT = 'TRAINER_EFFECT',
  ENERGY_EFFECT = 'ENERGY_EFFECT',
  TOOL_EFFECT = 'TOOL_EFFECT',
  STADIUM_EFFECT = 'STADIUM_EFFECT',
  SUPPORTER_EFFECT = 'SUPPORTER_EFFECT',
  COIN_FLIP_EFFECT = 'COIN_FLIP_EFFECT',
  COIN_FLIP_SEQUENCE_EFFECT = 'COIN_FLIP_SEQUENCE_EFFECT',
  TRAINER_CARD_TO_DECK_EFFECT = 'TRAINER_CARD_TO_DECK_EFFECT',
  DISCARD_TO_HAND_EFFECT = 'DISCARD_TO_HAND_EFFECT',
  TRAINER_TARGET_EFFECT = 'TRAINER_TARGET_EFFECT',
}

export class AttachEnergyEffect implements Effect {
  readonly type: string = PlayCardEffects.ATTACH_ENERGY_EFFECT;
  public preventDefault = false;
  public player: Player;
  public energyCard: EnergyCard;
  public target: PokemonCardList;

  constructor(player: Player, energyCard: EnergyCard, target: PokemonCardList) {
    this.player = player;
    this.energyCard = energyCard;
    this.target = target;
  }
}

export class PlayPokemonEffect implements Effect {
  readonly type: string = PlayCardEffects.PLAY_POKEMON_EFFECT;
  public preventDefault = false;
  public skipMegaEvolutionEndTurn = false;
  public player: Player;
  public pokemonCard: PokemonCard;
  public target: PokemonCardList;
  public slot?: SlotType;
  public index?: number;

  constructor(player: Player, pokemonCard: PokemonCard, target: PokemonCardList, slot?: SlotType, index?: number) {
    this.player = player;
    this.pokemonCard = pokemonCard;
    this.target = target;
    this.slot = slot;
    this.index = index;
    if (pokemonCard.stage === Stage.BASIC) {
      this.target.showBasicAnimation = true;
    }
  }
}

export class PlaySupporterEffect implements Effect {
  readonly type: string = PlayCardEffects.PLAY_SUPPORTER_EFFECT;
  public preventDefault = false;
  public player: Player;
  public trainerCard: TrainerCard;
  public target: CardList | undefined;

  constructor(player: Player, trainerCard: TrainerCard, target?: CardList) {
    this.player = player;
    this.trainerCard = trainerCard;
    this.target = target;
  }
}

export class PlayStadiumEffect implements Effect {
  readonly type: string = PlayCardEffects.PLAY_STADIUM_EFFECT;
  public preventDefault = false;
  public player: Player;
  public trainerCard: TrainerCard;

  constructor(player: Player, trainerCard: TrainerCard) {
    this.player = player;
    this.trainerCard = trainerCard;
  }
}

export class AttachPokemonToolEffect implements Effect {
  readonly type: string = PlayCardEffects.PLAY_POKEMON_TOOL_EFFECT;
  public preventDefault = false;
  public player: Player;
  public trainerCard: TrainerCard;
  public target: PokemonCardList;

  constructor(player: Player, trainerCard: TrainerCard, target: PokemonCardList) {
    this.player = player;
    this.trainerCard = trainerCard;
    this.target = target;
  }
}

export class PlayItemEffect implements Effect {
  readonly type: string = PlayCardEffects.PLAY_ITEM_EFFECT;
  public preventDefault = false;
  public player: Player;
  public trainerCard: TrainerCard;
  public target: CardList | undefined;

  constructor(player: Player, trainerCard: TrainerCard, target?: CardList) {
    this.player = player;
    this.trainerCard = trainerCard;
    this.target = target;
  }
}

export class TrainerEffect implements Effect {
  readonly type: string = PlayCardEffects.TRAINER_EFFECT;
  public preventDefault = false;
  public player: Player;
  public trainerCard: TrainerCard;
  public target: CardList | undefined;

  constructor(player: Player, trainerCard: TrainerCard, target?: CardList) {
    this.player = player;
    this.trainerCard = trainerCard;
    this.target = target;
  }
}

export class EnergyEffect implements Effect {
  readonly type: string = PlayCardEffects.ENERGY_EFFECT;
  public preventDefault = false;
  public player: Player;
  public card: EnergyCard;

  constructor(player: Player, card: EnergyCard) {
    this.player = player;
    this.card = card;
  }
}

export class ToolEffect implements Effect {
  readonly type: string = PlayCardEffects.TOOL_EFFECT;
  public preventDefault = false;
  public player: Player;
  public card: TrainerCard;

  constructor(player: Player, card: TrainerCard) {
    this.player = player;
    this.card = card;
  }
}

export class StadiumEffect implements Effect {
  readonly type: string = PlayCardEffects.STADIUM_EFFECT;
  public preventDefault = false;
  public player: Player;
  public target: PokemonCardList;
  public stadium?: TrainerCard;
  public skipAbilityLockCheck = false;

  constructor(player: Player, target: PokemonCardList, stadium?: TrainerCard) {
    this.player = player;
    this.target = target;
    this.stadium = stadium;
  }
}

export class SupporterEffect implements Effect {
  readonly type: string = PlayCardEffects.SUPPORTER_EFFECT;
  public preventDefault = false;
  public player: Player;
  public card: TrainerCard;
  public target: CardList | undefined;

  constructor(player: Player, card: TrainerCard) {
    this.player = player;
    this.card = card;
  }
}

export class CoinFlipEffect implements Effect {
  readonly type: string = PlayCardEffects.COIN_FLIP_EFFECT;
  public preventDefault = false;
  public player: Player;
  public callback?: (result: boolean) => void;
  public result?: boolean;
  public skipReflipStadium?: boolean;
  public skipReflipTool?: boolean;

  constructor(player: Player, callback?: (result: boolean) => void) {
    this.player = player;
    this.callback = callback;
  }
}

export class CoinFlipSequenceEffect implements Effect {
  readonly type: string = PlayCardEffects.COIN_FLIP_SEQUENCE_EFFECT;
  public preventDefault = false;
  public player: Player;
  public mode: 'untilTails' | number;
  public callback: (results: boolean[]) => void;
  public skipReflipStadium?: boolean;
  public skipReflipTool?: boolean;

  constructor(player: Player, mode: 'untilTails' | number, callback: (results: boolean[]) => void) {
    this.player = player;
    this.mode = mode;
    this.callback = callback;
  }
}

export class TrainerToDeckEffect implements Effect {
  readonly type: string = PlayCardEffects.TRAINER_CARD_TO_DECK_EFFECT;
  public preventDefault = false;
  public player: Player;
  public card: TrainerCard;

  constructor(player: Player, card: TrainerCard) {
    this.player = player;
    this.card = card;
  }
}

export class DiscardToHandEffect implements Effect {
  readonly type: string = PlayCardEffects.DISCARD_TO_HAND_EFFECT;
  public preventDefault = false;
  public player: Player;
  public card: Card;

  constructor(player: Player, card: Card) {
    this.player = player;
    this.card = card;
  }
}

export class TrainerTargetEffect implements Effect {
  readonly type: string = PlayCardEffects.TRAINER_TARGET_EFFECT;
  public preventDefault = false;
  public player: Player;
  public trainerCard: TrainerCard;
  public target: PokemonCardList | undefined;
  /** Card whose reduceEffect blocked this probe. Not serialized to the client. */
  public blockedBy?: Card;

  constructor(player: Player, trainerCard: TrainerCard, target?: PokemonCardList) {
    this.player = player;
    this.trainerCard = trainerCard;
    this.target = target;
  }
}

export class PlayPokemonFromDeckEffect implements Effect {
  readonly type: string = PlayCardEffects.PLAY_POKEMON_FROM_DECK_EFFECT;
  public preventDefault = false;
  public player: Player;
  public pokemonCard: PokemonCard;
  public target: PokemonCardList;
  public slot?: SlotType;
  public index?: number;

  constructor(player: Player, pokemonCard: PokemonCard, target: PokemonCardList, slot?: SlotType, index?: number) {
    this.player = player;
    this.pokemonCard = pokemonCard;
    this.target = target;
    this.slot = slot;
    this.index = index;
    if (pokemonCard.stage === Stage.BASIC) {
      this.target.showBasicAnimation = true;
    }
  }
}

export class PlayPokemonFromDiscardEffect implements Effect {
  readonly type: string = PlayCardEffects.PLAY_POKEMON_FROM_DISCARD_EFFECT;
  public preventDefault = false;
  public player: Player;
  public pokemonCard: PokemonCard;
  public target: PokemonCardList;
  public slot?: SlotType;
  public index?: number;

  constructor(player: Player, pokemonCard: PokemonCard, target: PokemonCardList, slot?: SlotType, index?: number) {
    this.player = player;
    this.pokemonCard = pokemonCard;
    this.target = target;
    this.slot = slot;
    this.index = index;
    if (pokemonCard.stage === Stage.BASIC) {
      this.target.showBasicAnimation = true;
    }
  }
}
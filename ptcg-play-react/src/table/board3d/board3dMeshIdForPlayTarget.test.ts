import { describe, expect, it } from 'vitest';
import { SuperType, TrainerType, type Card } from 'ptcg-server';
import {
  cardIsStadium,
  cardIsSupporter,
  cardIsTrainerBoardHandPlay,
  resolveTrainerType,
} from './board3dMeshIdForPlayTarget';

/** CardsInfo JSON shape: `_trainerType` present, getter absent. */
function plainTrainer(trainerType: TrainerType, extras: Partial<Card> = {}): Card {
  return {
    superType: SuperType.TRAINER,
    _trainerType: trainerType,
    name: 'Test',
    ...extras,
  } as unknown as Card;
}

describe('resolveTrainerType / CardsInfo plain objects', () => {
  it('reads _trainerType when the TrainerCard getter is missing', () => {
    expect(resolveTrainerType(plainTrainer(TrainerType.STADIUM))).toBe(TrainerType.STADIUM);
    expect(resolveTrainerType(plainTrainer(TrainerType.ITEM))).toBe(TrainerType.ITEM);
    expect(resolveTrainerType(plainTrainer(TrainerType.SUPPORTER))).toBe(TrainerType.SUPPORTER);
    expect(resolveTrainerType(plainTrainer(TrainerType.TOOL))).toBe(TrainerType.TOOL);
  });

  it('does not treat stadium or tool as board hand plays', () => {
    expect(cardIsTrainerBoardHandPlay(plainTrainer(TrainerType.STADIUM))).toBe(false);
    expect(cardIsTrainerBoardHandPlay(plainTrainer(TrainerType.TOOL))).toBe(false);
    expect(cardIsTrainerBoardHandPlay(plainTrainer(TrainerType.ITEM))).toBe(true);
    expect(cardIsTrainerBoardHandPlay(plainTrainer(TrainerType.SUPPORTER))).toBe(true);
  });

  it('classifies stadium and supporter from plain objects', () => {
    expect(cardIsStadium(plainTrainer(TrainerType.STADIUM))).toBe(true);
    expect(cardIsStadium(plainTrainer(TrainerType.ITEM))).toBe(false);
    expect(cardIsSupporter(plainTrainer(TrainerType.SUPPORTER))).toBe(true);
    expect(cardIsSupporter(plainTrainer(TrainerType.STADIUM))).toBe(false);
  });
});

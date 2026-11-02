import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toPascalClassName } from './cardIdentity';
import { matchEffectTextPartial } from './prefabs/matcher';
import {
  asciiCardName,
  bonusDamageFromText,
  energyTypesCompatible,
  fossilEvolvesTo,
  healFromDamageCounters,
  isFossilTrainer,
  isTechnicalMachine,
  joinRelatedClauses,
  substituteCallCaptures,
  substituteNumbersInCode,
} from './textAccuracy';

describe('Poké naming', () => {
  it('keeps the e in Poké / Pokémon class names', () => {
    assert.equal(asciiCardName('Poké Healer +'), 'Poke Healer +');
    assert.equal(asciiCardName('Night Pokémon Center'), 'Night Pokemon Center');
    assert.equal(asciiCardName('Pokémon Park'), 'Pokemon Park');
    assert.equal(toPascalClassName('Poké Healer +'), 'PokeHealer');
    assert.equal(toPascalClassName('Poké Radar'), 'PokeRadar');
    assert.equal(toPascalClassName('Night Pokémon Center'), 'NightPokemonCenter');
    assert.equal(toPascalClassName('Pokémon Park'), 'PokemonPark');
  });
});

describe('bonus damage numbers', () => {
  it('uses the plus-more amount, not base plus bonus', () => {
    assert.equal(
      bonusDamageFromText('Flip a coin. If heads, this attack does 10 damage plus 10 more damage.'),
      '10'
    );
    assert.equal(
      bonusDamageFromText('Flip a coin. If heads, this attack does 10 damage plus 20 more damage.'),
      '20'
    );
    assert.equal(
      bonusDamageFromText('Flip a coin. If heads, this attack does 10 more damage.'),
      '10'
    );
  });

  it('substitutes the sample call amount with the captured bonus', () => {
    const call = 'FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 20);';
    const rewritten = substituteCallCaptures(
      call,
      'Flip a coin. If heads, this attack does 10 damage plus 20 more damage.',
      ['10', '10']
    );
    assert.equal(rewritten, 'FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE(store, state, effect, 10);');
  });
});

describe('prefab matching', () => {
  it('matches DP-era Quick Attack as +10, not +20', () => {
    const { matched, unmatched } = matchEffectTextPartial(
      'Flip a coin. If heads, this attack does 10 damage plus 10 more damage.',
      'attack'
    );
    assert.equal(unmatched.length, 0);
    assert.equal(matched[0]?.prefab.id, 'FLIP_A_COIN_IF_HEADS_DEAL_MORE_DAMAGE');
    assert.equal(matched[0]?.params.damage, '10');
  });

  it('generates Lapras VMAX G-Max Pump using Water Energy, not a Psychic sample', () => {
    const { matched, unmatched } = matchEffectTextPartial(
      'This attack does 30 more damage for each [W] Energy attached to this Pokémon.',
      'attack'
    );
    assert.equal(unmatched.length, 0);
    assert.equal(
      matched[0]?.prefab.id,
      'THIS_ATTACK_DOES_X_MORE_DAMAGE_FOR_EACH_ENERGY_TYPE_ATTACHED_TO_THIS_POKEMON'
    );
    assert.equal(matched[0]?.params.damage, '30');
    assert.equal(matched[0]?.params.energyType, 'W');
    const generated = matched[0].prefab.generateCall(matched[0].params, {
      kind: 'attack',
      index: 0,
    });
    assert.match(generated.lines.join('\n'), /CardType\.WATER/);
    assert.doesNotMatch(generated.lines.join('\n'), /PSYCHIC/);
  });

  it('generates typed Energy effects from their spelled-out type', () => {
    const { matched, unmatched } = matchEffectTextPartial(
      'This attack does 20 more damage for each Psychic Energy attached to this Pokémon.',
      'attack'
    );
    assert.equal(unmatched.length, 0);
    assert.equal(matched[0]?.params.energyType?.toLowerCase(), 'psychic');
    const generated = matched[0].prefab.generateCall(matched[0].params, {
      kind: 'attack',
      index: 0,
    });
    assert.match(generated.lines.join('\n'), /CardType\.PSYCHIC/);
  });

  it('matches Double Kick coin-times-heads with the printed per-heads damage', () => {
    const { matched, unmatched } = matchEffectTextPartial(
      'Flip 2 coins. This attack does 50 damage times the number of heads.',
      'attack'
    );
    assert.equal(unmatched.length, 0);
    assert.equal(matched[0]?.prefab.id, 'MULTIPLE_COIN_FLIPS_TIMES_HEADS');
    assert.equal(matched[0]?.params.coins, '2');
    assert.equal(matched[0]?.params.damage, '50');
  });

  it('heals 10 for a single damage counter', () => {
    const { matched } = matchEffectTextPartial('Remove 1 damage counter from Beautifly.', 'attack');
    assert.equal(matched[0]?.prefab.id, 'HEAL_X_DAMAGE_FROM_THIS_POKEMON');
    const call = matched[0].prefab.generateCall(matched[0].params, { kind: 'attack', index: 0 });
    assert.match(call.lines[0], /HEAL_X_DAMAGE_FROM_THIS_POKEMON\(10,/);
  });

  it('keeps flip-a-coin + if-heads as one clause', () => {
    const joined = joinRelatedClauses(['Flip a coin.', 'If heads, this attack does 10 more damage.']);
    assert.equal(joined.length, 1);
    assert.match(joined[0], /Flip a coin\. If heads/);
  });
});

describe('trainers and energy helpers', () => {
  it('detects fossils, TMs, and counter-to-HP conversion', () => {
    assert.equal(isFossilTrainer('Armor Fossil', 'Play Armor Fossil as if it were a Colorless Basic Pokémon.'), true);
    assert.equal(fossilEvolvesTo('Armor Fossil'), 'Shieldon');
    assert.equal(isTechnicalMachine('Technical Machine TS-1', 'That Pokémon may use this card\'s attack instead of its own.'), true);
    assert.equal(healFromDamageCounters('1'), 10);
    assert.equal(healFromDamageCounters('8'), 80);
    assert.equal(healFromDamageCounters('a'), 10);
  });

  it('matches bracketed and spelled-out Energy types while rejecting type mismatches', () => {
    assert.equal(energyTypesCompatible(
      'This attack does 30 more damage for each [W] Energy attached to this Pokémon.',
      'This attack does 30 more damage for each Water Energy attached to this Pokémon.'
    ), true);
    assert.equal(energyTypesCompatible(
      'This attack does 30 more damage for each [W] Energy attached to this Pokémon.',
      'This attack does 30 more damage for each [P] Energy attached to this Pokémon.'
    ), false);
    assert.equal(energyTypesCompatible(
      'This attack does 30 more damage for each [W] Energy attached to this Pokémon.',
      'This attack does 30 more damage for each Psychic Energy attached to this Pokémon.'
    ), false);
    assert.equal(energyTypesCompatible(
      'This attack does 30 more damage for each Water Energy attached to this Pokémon.',
      'This attack does 30 more damage for each Psychic Energy attached to this Pokémon.'
    ), false);
    assert.equal(energyTypesCompatible(
      'This attack does 30 more damage for each Energy attached to this Pokémon.',
      'This attack does 30 more damage for each [W] Energy attached to this Pokémon.'
    ), false);
  });

  it('does not rewrite WAS_ATTACK_USED indexes when substituting numbers', () => {
    const source = "if (WAS_ATTACK_USED(effect, 1, this)) {\n  effect.damage += 20;\n}";
    const rewritten = substituteNumbersInCode(
      source,
      'This attack does 20 more damage.',
      'This attack does 10 more damage.'
    );
    assert.match(rewritten, /WAS_ATTACK_USED\(effect, 1, this\)/);
    assert.match(rewritten, /effect\.damage \+= 10/);
  });
});

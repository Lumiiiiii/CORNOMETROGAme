import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTimerHiddenDuringRun,
  splitTimerParts,
  formatSeconds,
  parseSecondsInput,
  evaluateAttempt,
  evaluateClassicGuesses,
  computeSessionSummary,
} from './rules.ts';

test('isTimerHiddenDuringRun hides timer automatically in Modalità Al Buio', () => {
  assert.equal(isTimerHiddenDuringRun('buio', false), true);
  assert.equal(isTimerHiddenDuringRun('classica', false), false);
  assert.equal(isTimerHiddenDuringRun('sfida', false), false);
  assert.equal(isTimerHiddenDuringRun('sfida', true), true);
});

test('splitTimerParts and formatSeconds format milliseconds accurately', () => {
  const parts = splitTimerParts(7428);
  assert.equal(parts.secondsStr, '07');
  assert.equal(parts.centisecondsStr, '42');
  assert.equal(parts.formatted, '07.42');
  assert.equal(formatSeconds(7428), '07.42s');
});

test('parseSecondsInput validates and normalizes Italian comma or dot decimals', () => {
  assert.equal(parseSecondsInput('5,5'), 5.5);
  assert.equal(parseSecondsInput('10.25'), 10.25);
  assert.equal(parseSecondsInput('0'), null);
  assert.equal(parseSecondsInput('-3'), null);
  assert.equal(parseSecondsInput('abc'), null);
});

test('evaluateAttempt grades precision and calculates streak bonuses', () => {
  const perfect = evaluateAttempt(5030, 5000, 0);
  assert.equal(perfect.grade, 'PERFETTO');
  assert.equal(perfect.absErrorMs, 30);
  assert.equal(perfect.totalPoints, 1000);
  assert.equal(perfect.nextStreak, 1);

  const sniperWithStreak = evaluateAttempt(10150, 10000, 2);
  assert.equal(sniperWithStreak.grade, 'CECCHINO');
  assert.equal(sniperWithStreak.absErrorMs, 150);
  assert.equal(sniperWithStreak.totalPoints, 750 + 200);
  assert.equal(sniperWithStreak.nextStreak, 3);

  const offTarget = evaluateAttempt(8500, 5000, 3);
  assert.equal(offTarget.grade, 'FUORI_TEMPO');
  assert.equal(offTarget.nextStreak, 0);
});

test('evaluateClassicGuesses ranks friends by closest guess and awards winner bonus', () => {
  const ranked = evaluateClassicGuesses(6500, [
    { playerId: '1', playerName: 'Marco', guessSeconds: 8.0 },
    { playerId: '2', playerName: 'Giulia', guessSeconds: 6.4 },
    { playerId: '3', playerName: 'Luca', guessSeconds: 5.5 },
  ]);

  assert.equal(ranked.length, 3);
  assert.equal(ranked[0].playerName, 'Giulia');
  assert.equal(ranked[0].isWinner, true);
  assert.equal(ranked[0].absErrorMs, 100);
  assert.equal(ranked[1].playerName, 'Luca');
  assert.equal(ranked[2].playerName, 'Marco');
});

test('computeSessionSummary aggregates round metrics accurately', () => {
  const summary = computeSessionSummary([
    {
      id: 'r1',
      roundNumber: 1,
      mode: 'sfida',
      actualMs: 5020,
      referenceMs: 5000,
      absErrorMs: 20,
      accuracyPercent: 99.2,
      grade: 'PERFETTO',
      gradeLabel: 'OROLOGIO SVIZZERO!',
      points: 1000,
    },
    {
      id: 'r2',
      roundNumber: 2,
      mode: 'buio',
      actualMs: 7180,
      referenceMs: 7000,
      absErrorMs: 180,
      accuracyPercent: 97.0,
      grade: 'CECCHINO',
      gradeLabel: 'CECCHINO DEL TEMPO!',
      points: 850,
    },
  ]);

  assert.equal(summary.roundsPlayed, 2);
  assert.equal(summary.totalPoints, 1850);
  assert.equal(summary.bestErrorMs, 20);
  assert.equal(summary.perfectCount, 2);
  assert.equal(summary.rankTitle, 'Maestro Orologiaio Svizzero');
});

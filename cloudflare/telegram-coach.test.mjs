import assert from 'node:assert/strict';
import test from 'node:test';
import { coachTradeEventType, parseTelegramCoachUpdate } from './telegram-coach.mjs';

test('accepts a bounded message from a private chat matching the sender', () => {
  assert.deepEqual(parseTelegramCoachUpdate({
    update_id: 123,
    message: {
      message_id: 9,
      from: { id: 456 },
      chat: { id: 456, type: 'private' },
      text: ' استاد، امروز خیلی عجله دارم ',
    },
  }), {
    updateId: 123,
    userId: '456',
    message: 'استاد، امروز خیلی عجله دارم',
    telegramMessageId: '9',
  });
});

test('rejects groups, mismatched senders, invalid updates, and oversized text', () => {
  const update = {
    update_id: 123,
    message: { from: { id: 456 }, chat: { id: 456, type: 'private' }, text: 'سلام' },
  };
  assert.equal(parseTelegramCoachUpdate({ ...update, message: { ...update.message, chat: { id: -10, type: 'group' } } }), null);
  assert.equal(parseTelegramCoachUpdate({ ...update, message: { ...update.message, chat: { id: 789, type: 'private' } } }), null);
  assert.equal(parseTelegramCoachUpdate({ ...update, update_id: 1.5 }), null);
  assert.equal(parseTelegramCoachUpdate({ ...update, message: { ...update.message, text: 'x'.repeat(3001) } }), null);
});

test('identifies only newly recorded and newly closed trades for immediate review', () => {
  assert.equal(coachTradeEventType(null, { id: 'trade1', status: 'open' }), 'trade_created');
  assert.equal(coachTradeEventType(null, { id: 'trade2', status: 'closed' }), 'trade_saved_closed');
  assert.equal(coachTradeEventType({ id: 'trade1', status: 'open' }, { id: 'trade1', status: 'closed' }), 'trade_closed');
  assert.equal(coachTradeEventType({ id: 'trade1', status: 'open' }, { id: 'trade1', status: 'open' }), '');
});

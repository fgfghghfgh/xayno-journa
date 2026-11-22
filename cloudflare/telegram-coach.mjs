export function parseTelegramCoachUpdate(update) {
  const message = update?.message;
  const senderId = String(message?.from?.id || '');
  const chatId = String(message?.chat?.id || '');
  const text = typeof message?.text === 'string' ? message.text.trim() : '';
  const updateId = Number(update?.update_id);
  if (!Number.isSafeInteger(updateId) || updateId < 0
    || message?.chat?.type !== 'private'
    || !/^\d{1,20}$/.test(senderId)
    || senderId !== chatId
    || !text || text.length > 3000) return null;
  return { updateId, userId: senderId, message: text, telegramMessageId: String(message.message_id || '') };
}

export function coachTradeEventType(previousTrade, nextTrade) {
  if (!nextTrade || !String(nextTrade.id || '').trim()) return '';
  if (!previousTrade) return nextTrade.status === 'closed' ? 'trade_saved_closed' : 'trade_created';
  return previousTrade.status !== 'closed' && nextTrade.status === 'closed' ? 'trade_closed' : '';
}

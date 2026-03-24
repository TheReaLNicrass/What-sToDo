const crypto = require('crypto');

const COOKIE_NAME = 'whattodo_session';

function getSecret() {
  return process.env.SESSION_SECRET || 'whatstodo-dev-secret';
}

function signValue(value) {
  return crypto.createHmac('sha256', getSecret()).update(value).digest('hex');
}

function createSessionCookie(userId) {
  const payload = `${userId}.${signValue(userId)}`;
  return `${COOKIE_NAME}=${payload}; Path=/; HttpOnly; SameSite=Lax`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf('=');
        return [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
      }),
  );
}

function readSessionUserId(header = '') {
  const value = parseCookies(header)[COOKIE_NAME];
  if (!value) return null;
  const [userId, signature] = value.split('.');
  if (!userId || !signature) return null;
  return signValue(userId) === signature ? userId : null;
}

module.exports = { COOKIE_NAME, createSessionCookie, clearSessionCookie, readSessionUserId };
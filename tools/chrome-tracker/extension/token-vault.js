/* Passphrase-encrypted GitHub PAT. Only the ciphertext survives Chrome restart. */
(function(g) {
  'use strict';
  const VERSION = 1, ITERATIONS = 600000, SALT_BYTES = 16, IV_BYTES = 12;
  const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', {fatal: true});
  const fieldNames = ['version','endpoint','algorithm','kdf','iterations','salt','iv','ciphertext'];
  const toBase64 = bytes => btoa(String.fromCharCode(...bytes));
  function fromBase64(value, length = null) {
    if (typeof value !== 'string' || !value || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) throw Error('Unsupported saved token vault.');
    let bytes;
    try { bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0)); }
    catch { throw Error('Unsupported saved token vault.'); }
    if (toBase64(bytes) !== value || (length !== null && bytes.length !== length)) throw Error('Unsupported saved token vault.');
    return bytes;
  }
  function passphraseBytes(passphrase) {
    if (typeof passphrase !== 'string' || passphrase.length < 16 || passphrase.length > 256)
      throw Error('Choose a separate passphrase of at least 16 characters.');
    return encoder.encode(passphrase);
  }
  function validToken(token) {
    if (typeof token !== 'string' || token.length > 256 || !/^github_pat_[A-Za-z0-9_]+$/.test(token))
      throw Error('A restricted fine-grained GitHub token is required.');
  }
  function aad(endpoint) {
    return encoder.encode('MyAtlas LeetCode saved token v1: ' + endpoint);
  }
  async function key(passphrase, salt) {
    const bytes = passphraseBytes(passphrase);
    try {
      const material = await g.crypto.subtle.importKey('raw', bytes, 'PBKDF2', false, ['deriveKey']);
      return await g.crypto.subtle.deriveKey(
        {name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256'},
        material, {name: 'AES-GCM', length: 256}, false, ['encrypt','decrypt']
      );
    } finally { bytes.fill(0); }
  }
  function parse(value, endpoint) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).sort().join('|') !== fieldNames.slice().sort().join('|') ||
        value.version !== VERSION || value.endpoint !== endpoint ||
        value.algorithm !== 'AES-256-GCM' || value.kdf !== 'PBKDF2-SHA256' ||
        value.iterations !== ITERATIONS || JSON.stringify(value).length > 2048)
      throw Error('Unsupported saved token vault. Set up a new token instead.');
    const salt = fromBase64(value.salt, SALT_BYTES);
    const iv = fromBase64(value.iv, IV_BYTES);
    const ciphertext = fromBase64(value.ciphertext);
    if (ciphertext.length < 32 || ciphertext.length > 272)
      throw Error('Unsupported saved token vault. Set up a new token instead.');
    return {salt, iv, ciphertext};
  }
  async function seal(token, passphrase, endpoint) {
    validToken(token);
    if (typeof endpoint !== 'string' || !endpoint.startsWith('https://api.github.com/repos/Planton361/myatlas/contents/'))
      throw Error('Unexpected GitHub token destination.');
    const salt = g.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = g.crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const secret = encoder.encode(token);
    try {
      const ciphertext = new Uint8Array(await g.crypto.subtle.encrypt(
        {name: 'AES-GCM', iv, additionalData: aad(endpoint)}, await key(passphrase, salt), secret
      ));
      return {version: VERSION, endpoint, algorithm: 'AES-256-GCM', kdf: 'PBKDF2-SHA256',
        iterations: ITERATIONS, salt: toBase64(salt), iv: toBase64(iv), ciphertext: toBase64(ciphertext)};
    } finally { secret.fill(0); }
  }
  async function open(value, passphrase, endpoint) {
    const {salt, iv, ciphertext} = parse(value, endpoint);
    try {
      const bytes = new Uint8Array(await g.crypto.subtle.decrypt(
        {name: 'AES-GCM', iv, additionalData: aad(endpoint)}, await key(passphrase, salt), ciphertext
      ));
      try { const token = decoder.decode(bytes); validToken(token); return token; }
      finally { bytes.fill(0); }
    } catch {
      throw Error('Could not unlock saved token: incorrect passphrase or damaged vault. Progress is unchanged.');
    }
  }
  const api = Object.freeze({seal, open});
  g.MyAtlasTokenVault = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);

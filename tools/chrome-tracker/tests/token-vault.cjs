const {test} = require('node:test');
const assert = require('node:assert/strict');
const V = require('../extension/token-vault.js');
const endpoint = 'https://api.github.com/repos/Planton361/myatlas/contents/progress/leetcode/solved.json';
const token = 'github_pat_DISPOSABLE_TEST_ONLY_TOKEN_NO_PRIVILEGES';
const passphrase = 'my separate long disposable vault passphrase';

test('an encrypted vault survives serialization without exposing token or passphrase', async () => {
  const saved = await V.seal(token,passphrase,endpoint);
  assert.deepEqual(Object.keys(saved).sort(),['algorithm','ciphertext','endpoint','iterations','iv','kdf','salt','version']);
  assert.equal(saved.iterations,600000);
  assert.equal(saved.algorithm,'AES-256-GCM');
  assert.equal(saved.kdf,'PBKDF2-SHA256');
  assert(!JSON.stringify(saved).includes(token));
  assert(!JSON.stringify(saved).includes(passphrase));
  assert.equal(await V.open(JSON.parse(JSON.stringify(saved)),passphrase,endpoint),token);
  const second=await V.seal(token,passphrase,endpoint);
  assert.notEqual(saved.ciphertext,second.ciphertext);
  assert.notEqual(saved.iv,second.iv);
  assert.notEqual(saved.salt,second.salt);
});

test('wrong password, tampering and endpoint substitution never disclose a PAT', async () => {
  const saved=await V.seal(token,passphrase,endpoint);
  await assert.rejects(V.open(saved,'wrong long passphrase for test',endpoint),/Could not unlock/);
  await assert.rejects(V.open(saved,passphrase,endpoint.replace('/myatlas/','/other/')),/Unsupported saved token vault/);
  const bytes=Buffer.from(saved.ciphertext,'base64');bytes[0]^=1;
  await assert.rejects(V.open({...saved,ciphertext:bytes.toString('base64')},passphrase,endpoint),/Could not unlock/);
  await assert.rejects(V.open({...saved,iv:saved.salt},passphrase,endpoint),/Unsupported saved token vault/);
  await assert.rejects(V.open({...saved,iterations:1000},passphrase,endpoint),/Unsupported saved token vault/);
  await assert.rejects(V.open({...saved,extra:'untrusted'},passphrase,endpoint),/Unsupported saved token vault/);
});

test('password strength and destination must be checked before storing a token', async () => {
  await assert.rejects(V.seal(token,'short',endpoint),/at least 16/);
  await assert.rejects(V.seal(token,passphrase,endpoint.replace('/myatlas/','/unrelated/')),/Unexpected GitHub token destination/);
  await assert.rejects(V.seal('not-a-token',passphrase,endpoint),/fine-grained GitHub token/);
});

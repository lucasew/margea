import { EncryptJWT, jwtDecrypt, jwtVerify } from 'jose';

async function testSessionEncryption() {
  console.log('🧪 Testing JWE Session Encryption Logic...');

  const SESSION_SECRET = 'super-secret-session-key-that-is-long-enough';
  const secretBytes = new TextEncoder().encode(SESSION_SECRET);

  // Derive key as implemented in api/auth/callback.ts
  const key = await crypto.subtle.digest('SHA-256', secretBytes);
  const derivedKey = new Uint8Array(key);

  const payload = {
    github_token: 'gho_1234567890abcdef',
    mode: 'read'
  };

  console.log('🔒 Encrypting payload...');
  const sessionToken = await new EncryptJWT(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .encrypt(derivedKey);

  console.log(`✅ Generated Token (JWE): ${sessionToken.substring(0, 20)}...`);

  // Verify it is not a JWS (cannot be verified with jwtVerify)
  try {
    await jwtVerify(sessionToken, secretBytes);
    console.error('❌ FAIL: JWE should not be verifiable as JWS');
    process.exit(1);
  } catch (e) {
    console.log('✅ Confirmed: Token cannot be verified as JWS (expected behavior).');
  }

  console.log('🔓 Decrypting payload...');
  // Decrypt as implemented in api/auth/token.ts
  try {
    const { payload: decrypted } = await jwtDecrypt(sessionToken, derivedKey);

    if (decrypted.github_token === payload.github_token && decrypted.mode === payload.mode) {
      console.log('✅ Success: Decrypted payload matches original.');
    } else {
      console.error('❌ FAIL: Payload mismatch', decrypted);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ FAIL: Decryption failed', error);
    process.exit(1);
  }
}

testSessionEncryption();

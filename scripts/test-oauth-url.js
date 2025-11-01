#!/usr/bin/env node

/**
 * Test Google OAuth URL Generation
 * This script helps debug OAuth configuration issues
 */

const crypto = require('crypto');

console.log('🔍 Testing Google OAuth URL Generation...\n');

// Load environment variables (if dotenv is available)
try {
    require('dotenv').config({ path: '.env.local' });
} catch (e) {
    console.warn('⚠️  dotenv not found. Install it with: npm install dotenv');
    console.warn('   Or set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID as environment variable.\n');
}

// Configuration - Use environment variable instead of hardcoded value
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';

if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    console.error('❌ ERROR: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set!');
    console.error('   Please create .env.local file with your Google OAuth Client ID.\n');
    process.exit(1);
}
const REDIRECT_URI = 'https://auth.expo.io/@hoangthao2222/project-exe101';
const SCOPES = ['openid', 'profile', 'email'];

// Generate PKCE challenge (simplified for testing)
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

console.log('1️⃣ PKCE Challenge Generation:');
console.log(`   Code Verifier: ${codeVerifier}`);
console.log(`   Code Challenge: ${codeChallenge}\n`);

// Build OAuth URL
const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true'
});

const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

console.log('2️⃣ OAuth URL Generation:');
console.log(`   Base URL: https://accounts.google.com/o/oauth2/v2/auth`);
console.log(`   Client ID: ${GOOGLE_CLIENT_ID}`);
console.log(`   Redirect URI: ${REDIRECT_URI}`);
console.log(`   Scopes: ${SCOPES.join(', ')}`);
console.log(`   Code Challenge: ${codeChallenge}`);
console.log(`   Access Type: offline`);
console.log(`   Prompt: consent\n`);

console.log('3️⃣ Full OAuth URL:');
console.log(oauthUrl);
console.log('\n4️⃣ Testing Instructions:');
console.log('   1. Copy the OAuth URL above');
console.log('   2. Open in browser (desktop or mobile)');
console.log('   3. Try to sign in with hoangthao2222@gmail.com');
console.log('   4. Check for any error messages');
console.log('   5. Verify redirect URI handling\n');

console.log('5️⃣ Common Issues & Solutions:');
console.log('   ❌ "invalid_request" → Check OAuth consent screen configuration');
console.log('   ❌ "redirect_uri_mismatch" → Verify redirect URI in Google Console');
console.log('   ❌ "access_denied" → Check scopes and test users');
console.log('   ❌ "unauthorized_client" → Verify client ID and bundle ID\n');

console.log('6️⃣ Next Steps:');
console.log('   1. Test OAuth URL in browser first');
console.log('   2. Fix any configuration issues');
console.log('   3. Test again in app');
console.log('   4. Implement backend integration\n');

console.log('🎯 Debug OAuth Configuration:');
console.log('   - OAuth consent screen must be configured');
console.log('   - Test users must be added');
console.log('   - Scopes must be approved');
console.log('   - Redirect URI must match exactly');
























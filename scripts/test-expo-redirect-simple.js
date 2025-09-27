#!/usr/bin/env node

/**
 * Test Expo Redirect URI - Simple Version
 */

console.log('🔍 Testing Expo Redirect URI...\n');

// Current configuration
const username = 'trendslade';
const appSlug = 'project-exe101';

console.log('1️⃣ Current Configuration:');
console.log(`   Username: ${username}`);
console.log(`   App Slug: ${appSlug}\n`);

// Expected redirect URI
const expectedUri = `https://auth.expo.io/@${username}/${appSlug}`;
console.log('2️⃣ Expected Redirect URI:');
console.log(`   ${expectedUri}\n`);

// Instructions
console.log('3️⃣ To verify this URI:');
console.log('   1. Run your Expo app');
console.log('   2. Check console logs when clicking Google Sign In');
console.log('   3. Look for the redirect URI in the logs\n');

console.log('4️⃣ In Google Cloud Console:');
console.log('   - Go to OAuth 2.0 Client IDs');
console.log('   - Add this URI to Authorized redirect URIs:');
console.log(`   - ${expectedUri}\n`);

console.log('5️⃣ Expected result:');
console.log('   - OAuth flow will work correctly');
console.log('   - No more "invalid_request" errors');
console.log('   - User can sign in with Google successfully\n');

console.log('🎯 Next Steps:');
console.log('   1. Verify the URI above is correct');
console.log('   2. Add it to Google Cloud Console');
console.log('   3. Test OAuth flow in your app');
























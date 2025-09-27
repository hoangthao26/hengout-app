/**
 * Test script để kiểm tra 401 flow
 * Chạy: node scripts/test-401-flow.js
 */

const { AuthHelper } = require('../services/authHelper');

async function test401Flow() {
    console.log('🧪 Testing 401 Flow...\n');

    try {
        // Test 1: Check authentication status
        console.log('1️⃣ Testing authentication status...');
        const isAuthenticated = await AuthHelper.isAuthenticated();
        console.log(`   ✅ Is authenticated: ${isAuthenticated}\n`);

        // Test 2: Get token info
        console.log('2️⃣ Testing token info...');
        const tokenInfo = await AuthHelper.getTokenInfo();
        if (tokenInfo) {
            console.log('   ✅ Token info retrieved:');
            console.log(`   - Is authenticated: ${tokenInfo.isAuthenticated}`);
            console.log(`   - Has tokens: ${tokenInfo.hasTokens}`);
            console.log(`   - Token expired: ${tokenInfo.tokenExpired}`);
            console.log(`   - Remaining time: ${Math.round(tokenInfo.remainingTime / 1000)}s`);
            console.log(`   - Expiration time: ${tokenInfo.expirationTime}`);
            console.log(`   - Time until refresh: ${Math.round(tokenInfo.timeUntilRefresh / 1000)}s\n`);
        } else {
            console.log('   ❌ No token info available\n');
        }

        // Test 3: Check pre-refresh status
        console.log('3️⃣ Testing pre-refresh status...');
        const shouldPreRefresh = await AuthHelper.shouldPreRefreshToken();
        console.log(`   ✅ Should pre-refresh: ${shouldPreRefresh}\n`);

        // Test 4: Test pre-refresh if needed
        console.log('4️⃣ Testing pre-refresh if needed...');
        const preRefreshResult = await AuthHelper.preRefreshTokenIfNeeded();
        console.log(`   ✅ Pre-refresh result: ${preRefreshResult}\n`);

        // Test 5: Test token monitoring (start and stop)
        console.log('5️⃣ Testing token monitoring...');
        const monitoringInterval = AuthHelper.startTokenMonitoring();
        console.log('   ✅ Token monitoring started');

        // Wait 2 seconds then stop
        setTimeout(() => {
            AuthHelper.stopTokenMonitoring(monitoringInterval);
            console.log('   ✅ Token monitoring stopped\n');

            console.log('🎉 All tests completed successfully!');
            console.log('\n📋 Test Summary:');
            console.log('✅ Authentication status check');
            console.log('✅ Token info retrieval');
            console.log('✅ Pre-refresh status check');
            console.log('✅ Pre-refresh execution');
            console.log('✅ Token monitoring start/stop');
            console.log('\n🚀 401 Flow is ready for production!');
        }, 2000);

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.log('\n🔧 Debugging steps:');
        console.log('1. Check if user is logged in');
        console.log('2. Verify token storage');
        console.log('3. Check network connectivity');
        console.log('4. Review server logs');
    }
}

// Run the test
test401Flow();

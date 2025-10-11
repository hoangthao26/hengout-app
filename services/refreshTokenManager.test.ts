/**
 * 🧪 REFRESH TOKEN MANAGER TEST
 * 
 * Test file để kiểm tra RefreshTokenManager hoạt động đúng
 */

import { refreshTokenManager } from './refreshTokenManager';

// Mock test functions
export const testRefreshTokenManager = {
    /**
     * Test start monitoring
     */
    async testStartMonitoring() {
        console.log('🧪 Testing startMonitoring...');
        try {
            await refreshTokenManager.startMonitoring();
            console.log('✅ startMonitoring test passed');
        } catch (error) {
            console.error('❌ startMonitoring test failed:', error);
        }
    },

    /**
     * Test perform refresh
     */
    async testPerformRefresh() {
        console.log('🧪 Testing performRefresh...');
        try {
            const result = await refreshTokenManager.performRefresh();
            console.log('✅ performRefresh test passed, result:', result);
        } catch (error) {
            console.error('❌ performRefresh test failed:', error);
        }
    },

    /**
     * Test get refresh status
     */
    async testGetRefreshStatus() {
        console.log('🧪 Testing getRefreshStatus...');
        try {
            const status = await refreshTokenManager.getRefreshStatus();
            console.log('✅ getRefreshStatus test passed, status:', status);
        } catch (error) {
            console.error('❌ getRefreshStatus test failed:', error);
        }
    },

    /**
     * Test app resume refresh
     */
    async testCheckAndRefreshOnResume() {
        console.log('🧪 Testing checkAndRefreshOnResume...');
        try {
            await refreshTokenManager.checkAndRefreshOnResume();
            console.log('✅ checkAndRefreshOnResume test passed');
        } catch (error) {
            console.error('❌ checkAndRefreshOnResume test failed:', error);
        }
    },

    /**
     * Test stop monitoring
     */
    testStopMonitoring() {
        console.log('🧪 Testing stopMonitoring...');
        try {
            refreshTokenManager.stopMonitoring();
            console.log('✅ stopMonitoring test passed');
        } catch (error) {
            console.error('❌ stopMonitoring test failed:', error);
        }
    },

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🚀 Running all RefreshTokenManager tests...');

        await this.testGetRefreshStatus();
        await this.testStartMonitoring();
        await this.testCheckAndRefreshOnResume();
        await this.testPerformRefresh();
        this.testStopMonitoring();

        console.log('🏁 All tests completed');
    }
};

// Export for use in other files
export default testRefreshTokenManager;

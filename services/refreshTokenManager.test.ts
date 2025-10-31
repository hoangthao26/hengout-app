/**
 * REFRESH TOKEN MANAGER TEST
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
        console.log('[Test] Testing startMonitoring...');
        try {
            await refreshTokenManager.startMonitoring();
            console.log('[Test] startMonitoring test passed');
        } catch (error) {
            console.error('[Test] startMonitoring test failed:', error);
        }
    },

    /**
     * Test perform refresh
     */
    async testPerformRefresh() {
        console.log('[Test] Testing performRefresh...');
        try {
            const result = await refreshTokenManager.performRefresh();
            console.log('[Test] performRefresh test passed, result:', result);
        } catch (error) {
            console.error('[Test] performRefresh test failed:', error);
        }
    },

    /**
     * Test get refresh status
     */
    async testGetRefreshStatus() {
        console.log('[Test] Testing getRefreshStatus...');
        try {
            const status = await refreshTokenManager.getRefreshStatus();
            console.log('[Test] getRefreshStatus test passed, status:', status);
        } catch (error) {
            console.error('[Test] getRefreshStatus test failed:', error);
        }
    },

    /**
     * Test app resume refresh
     */
    async testCheckAndRefreshOnResume() {
        console.log('[Test] Testing checkAndRefreshOnResume...');
        try {
            await refreshTokenManager.checkAndRefreshOnResume();
            console.log('[Test] checkAndRefreshOnResume test passed');
        } catch (error) {
            console.error('[Test] checkAndRefreshOnResume test failed:', error);
        }
    },

    /**
     * Test stop monitoring
     */
    testStopMonitoring() {
        console.log('[Test] Testing stopMonitoring...');
        try {
            refreshTokenManager.stopMonitoring();
            console.log('[Test] stopMonitoring test passed');
        } catch (error) {
            console.error('[Test] stopMonitoring test failed:', error);
        }
    },

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('[Test] Running all RefreshTokenManager tests...');

        await this.testGetRefreshStatus();
        await this.testStartMonitoring();
        await this.testCheckAndRefreshOnResume();
        await this.testPerformRefresh();
        this.testStopMonitoring();

        console.log('[Test] All tests completed');
    }
};

// Export for use in other files
export default testRefreshTokenManager;

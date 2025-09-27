const fs = require('fs');
const path = require('path');

// Files that still have showToast calls
const filesToFix = [
    'app/friend-request.tsx',
    'app/edit-profile.tsx',
    'app/auth/initialize-profile.tsx',
    'app/auth/onboarding-wizard.tsx',
    'app/auth/reset-password-otp.tsx',
    'app/auth/reset-password.tsx',
    'app/auth/forgot-password.tsx',
    'app/auth/verify-otp.tsx',
    'app/auth/signup.tsx'
];

// More specific toast mappings
const toastMappings = [
    // Success with Vietnamese messages
    { from: /showToast\('success',\s*'([^']+)'\)/g, to: "success('$1')" },
    { from: /showToast\('success',\s*"([^"]+)"\)/g, to: 'success("$1")' },

    // Error with Vietnamese messages
    { from: /showToast\('error',\s*'([^']+)'\)/g, to: "error('$1')" },
    { from: /showToast\('error',\s*"([^"]+)"\)/g, to: 'error("$1")' },

    // Info with Vietnamese messages
    { from: /showToast\('info',\s*'([^']+)'\)/g, to: "info('$1')" },
    { from: /showToast\('info',\s*"([^"]+)"\)/g, to: 'info("$1")' },

    // Warning with Vietnamese messages
    { from: /showToast\('warning',\s*'([^']+)'\)/g, to: "warning('$1')" },
    { from: /showToast\('warning',\s*"([^"]+)"\)/g, to: 'warning("$1")' },
];

function fixFile(filePath) {
    try {
        const fullPath = path.join(__dirname, filePath);

        if (!fs.existsSync(fullPath)) {
            console.log(`File not found: ${filePath}`);
            return;
        }

        let content = fs.readFileSync(fullPath, 'utf8');
        let updated = false;

        // Apply toast mappings
        toastMappings.forEach(mapping => {
            const newContent = content.replace(mapping.from, mapping.to);
            if (newContent !== content) {
                content = newContent;
                updated = true;
            }
        });

        if (updated) {
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`✅ Fixed: ${filePath}`);
        } else {
            console.log(`⏭️  No showToast calls found: ${filePath}`);
        }

    } catch (error) {
        console.error(`❌ Error fixing ${filePath}:`, error.message);
    }
}

// Fix all files
console.log('🔄 Fixing remaining showToast calls...\n');
filesToFix.forEach(fixFile);
console.log('\n✅ Toast fixes completed!');

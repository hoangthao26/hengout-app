const fs = require('fs');
const path = require('path');

// Files to update (excluding the ones we already updated)
const filesToUpdate = [
    'app/auth/signup.tsx',
    'app/auth/verify-otp.tsx',
    'app/auth/forgot-password.tsx',
    'app/auth/reset-password.tsx',
    'app/auth/reset-password-otp.tsx',
    'app/auth/initialize-profile.tsx',
    'app/auth/onboarding-wizard.tsx',
    'app/edit-profile.tsx',
    'app/edit-name.tsx',
    'app/edit-bio.tsx',
    'app/edit-gender.tsx',
    'app/edit-date-of-birth.tsx',
    'app/friend-request.tsx',
    'app/settings.tsx',
    'app/preferences.tsx',
    'app/(tabs)/profile.tsx',
    'app/(tabs)/discover.tsx',
    'app/(tabs)/chat.tsx'
];

// Toast mapping for common patterns
const toastMappings = [
    // Success patterns
    { from: /showToast\('success',\s*'([^']+)'\)/g, to: "success('$1')" },
    { from: /showToast\('success',\s*"([^"]+)"\)/g, to: 'success("$1")' },

    // Error patterns
    { from: /showToast\('error',\s*'([^']+)'\)/g, to: "error('$1')" },
    { from: /showToast\('error',\s*"([^"]+)"\)/g, to: 'error("$1")' },

    // Info patterns
    { from: /showToast\('info',\s*'([^']+)'\)/g, to: "info('$1')" },
    { from: /showToast\('info',\s*"([^"]+)"\)/g, to: 'info("$1")' },

    // Warning patterns
    { from: /showToast\('warning',\s*'([^']+)'\)/g, to: "warning('$1')" },
    { from: /showToast\('warning',\s*"([^"]+)"\)/g, to: 'warning("$1")' },
];

function updateFile(filePath) {
    try {
        const fullPath = path.join(__dirname, filePath);

        if (!fs.existsSync(fullPath)) {
            console.log(`File not found: ${filePath}`);
            return;
        }

        let content = fs.readFileSync(fullPath, 'utf8');
        let updated = false;

        // Update import
        if (content.includes("import { useToast } from '../../contexts/ToastContext';")) {
            content = content.replace(
                "import { useToast } from '../../contexts/ToastContext';",
                "import { useToast } from '../../services/toastService';"
            );
            updated = true;
        }

        if (content.includes("import { useToast } from '../hooks/useToast';")) {
            content = content.replace(
                "import { useToast } from '../hooks/useToast';",
                "import { useToast } from '../services/toastService';"
            );
            updated = true;
        }

        // Update useToast destructuring
        if (content.includes('const { success, error, info, warning } = useToast();')) {
            content = content.replace(
                'const { success, error, info, warning } = useToast();',
                'const { success, error, info, warning } = useToast();'
            );
            updated = true;
        }

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
            console.log(`✅ Updated: ${filePath}`);
        } else {
            console.log(`⏭️  No changes needed: ${filePath}`);
        }

    } catch (error) {
        console.error(`❌ Error updating ${filePath}:`, error.message);
    }
}

// Update all files
console.log('🔄 Updating toast imports and usage...\n');
filesToUpdate.forEach(updateFile);
console.log('\n✅ Toast update completed!');

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to copy adi-registration.properties
 * into the native Android assets directory for Google Play
 * package ownership verification.
 *
 * @param {object} config - Expo config
 * @param {object} options - Plugin options
 * @param {string} options.token - The token snippet from Google Play Console
 */
const withAdiRegistration = (config, options = {}) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const assetsDir = path.join(
                config.modRequest.platformProjectRoot,
                'app/src/main/assets'
            );

            if (!fs.existsSync(assetsDir)) {
                fs.mkdirSync(assetsDir, { recursive: true });
            }

            // Option 1: User provides token directly in plugin options
            if (options.token) {
                const dest = path.join(assetsDir, 'adi-registration.properties');
                fs.writeFileSync(dest, options.token);
                console.log('✅ adi-registration.properties written from token');
                return config;
            }

            // Option 2: User has the file in their assets folder
            const src = path.join(
                config.modRequest.projectRoot,
                'assets/adi-registration.properties'
            );

            if (!fs.existsSync(src)) {
                throw new Error(
                    '[expo-adi-registration] No token provided and no file found at assets/adi-registration.properties'
                );
            }

            const dest = path.join(assetsDir, 'adi-registration.properties');
            fs.copyFileSync(src, dest);
            console.log('✅ adi-registration.properties copied to Android assets');

            return config;
        },
    ]);
};

module.exports = withAdiRegistration;
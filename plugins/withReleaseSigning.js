const { withAppBuildGradle } = require('expo/config-plugins');

function patchGradle(source) {
  if (source.includes('def releaseStoreFile = findProperty(')) return source;

  const variables = `
def releaseStoreFile = findProperty('FIELD_TASK_RELEASE_STORE_FILE') ?: System.getenv('FIELD_TASK_RELEASE_STORE_FILE')
def releaseStorePassword = findProperty('FIELD_TASK_RELEASE_STORE_PASSWORD') ?: System.getenv('FIELD_TASK_RELEASE_STORE_PASSWORD')
def releaseKeyAlias = findProperty('FIELD_TASK_RELEASE_KEY_ALIAS') ?: System.getenv('FIELD_TASK_RELEASE_KEY_ALIAS')
def releaseKeyPassword = findProperty('FIELD_TASK_RELEASE_KEY_PASSWORD') ?: System.getenv('FIELD_TASK_RELEASE_KEY_PASSWORD')
def releaseSigningConfigured = releaseStoreFile && releaseStorePassword && releaseKeyAlias && releaseKeyPassword`;

  const flavorAnchor = /^(def jscFlavor = .*?)$/m;
  if (
    !flavorAnchor.test(source) ||
    !source.includes('signingConfigs {') ||
    !source.includes('buildTypes {')
  ) {
    throw new Error('Could not locate Android signing configuration in app/build.gradle.');
  }
  let result = source.replace(flavorAnchor, `$1\n${variables}`);
  result = result.replace(
    'signingConfigs {',
    `signingConfigs {
        if (releaseSigningConfigured) {
            release {
                storeFile file(releaseStoreFile)
                storePassword releaseStorePassword
                keyAlias releaseKeyAlias
                keyPassword releaseKeyPassword
            }
        }`,
  );

  const buildTypes = result.indexOf('buildTypes {');
  const release = result.indexOf('release {', buildTypes);
  const debugSigning = result.indexOf('signingConfig signingConfigs.debug', release);
  if (release < 0 || debugSigning < 0) {
    throw new Error('Could not locate the generated release signing setting.');
  }
  result =
    result.slice(0, debugSigning) +
    `if (releaseSigningConfigured) {
                signingConfig signingConfigs.release
            }` +
    result.slice(debugSigning + 'signingConfig signingConfigs.debug'.length);
  return result;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, config => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('Release signing plugin requires a Groovy Android build file.');
    }
    config.modResults.contents = patchGradle(config.modResults.contents);
    return config;
  });
};

module.exports.patchGradle = patchGradle;

/** @jest-environment node */
import { patchGradle } from '../plugins/withReleaseSigning';

const generated = `def jscFlavor = 'io.github.react-native-community:jsc-android:2026004.+'
android {
  signingConfigs {
    debug { storeFile file('debug.keystore') }
  }
  buildTypes {
    debug { signingConfig signingConfigs.debug }
    release { signingConfig signingConfigs.debug }
  }
}`;

it('replaces release debug signing when Expo regenerates Android files', () => {
  const patched = patchGradle(generated);
  expect(patched).toContain('FIELD_TASK_RELEASE_STORE_FILE');
  expect(patched).toContain('signingConfig signingConfigs.release');
  const releaseSection = patched.slice(
    patched.indexOf('release {', patched.indexOf('buildTypes {')),
  );
  expect(releaseSection).not.toContain('signingConfig signingConfigs.debug');
  expect(patchGradle(patched)).toBe(patched);
});

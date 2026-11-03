// covers: regression test for login failure bug (useEmulators in dev env)
import { environment } from './environment';
import { environment as e2eEnvironment } from './environment.e2e';
import type { Environment } from './environment.interface';

describe('Environment configuration', () => {
  describe('development environment', () => {
    it('should not have useEmulators enabled', () => {
      // REGRESSION: dev environment must use real Firebase.
      // Having useEmulators enabled in dev caused login failures
      // when emulators were not running.
      expect(environment.useEmulators).toBeUndefined();
    });

    it('should have valid Firebase config', () => {
      expect(environment.firebase.apiKey).toBeTruthy();
      expect(environment.firebase.projectId).toBe('carmanager-local');
      expect(environment.production).toBe(false);
    });

    it('should match Environment interface shape', () => {
      const env: Environment = environment;
      expect(env).toBeDefined();
      expect(typeof env.production).toBe('boolean');
      expect(typeof env.firebase.apiKey).toBe('string');
    });
  });

  describe('e2e environment', () => {
    it('should have useEmulators enabled', () => {
      // E2E environment must connect to Firebase emulators
      // which are started by Playwright before tests.
      expect(e2eEnvironment.useEmulators).toBeDefined();
      expect(e2eEnvironment.useEmulators?.host).toBe('localhost');
      expect(e2eEnvironment.useEmulators?.authPort).toBe(9099);
      expect(e2eEnvironment.useEmulators?.firestorePort).toBe(8080);
    });

    it('should use the same Firebase project as dev', () => {
      expect(e2eEnvironment.firebase.projectId).toBe(
        environment.firebase.projectId
      );
    });

    it('should not be production', () => {
      expect(e2eEnvironment.production).toBe(false);
    });
  });
});
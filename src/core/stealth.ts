/**
 * Stealth scripts to patch Chromium automation footprints
 */
export const STEALTH_SCRIPT = `
(() => {
  // 1. Hide webdriver flag
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
  });

  // 2. Mock plugins array
  Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5],
  });

  // 3. Mock languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-CN', 'zh', 'en-US', 'en'],
  });

  // 4. Mock chrome object
  if (!window.chrome) {
    (window as any).chrome = {
      runtime: {},
      loadTimes: () => {},
      csi: () => {},
      app: {},
    };
  }

  // 5. Mock permissions
  const originalQuery = window.navigator.permissions?.query;
  if (originalQuery) {
    window.navigator.permissions.query = (parameters: any) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
        : originalQuery(parameters);
  }
})();
`;

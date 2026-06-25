// `.webmanifest` is loaded as text by the esbuild loader (angular.json); parse
// the shipped file here so the test stays the single source of truth.
import manifestRaw from '../../../manifest.webmanifest';

/**
 * Asserts the PWA web manifest carries the brand identity and the fields a
 * browser needs to offer "Add to home screen" (R12 / U14).
 */
describe('manifest.webmanifest', () => {
  const manifest = JSON.parse(manifestRaw);

  it('declares the brand name and short_name', () => {
    expect(manifest.name).toBe('Hospital Santa María');
    expect(manifest.short_name).toBe('Santa María');
  });

  it('is a standalone, installable app rooted at /', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
  });

  it('uses the brand theme color', () => {
    expect(manifest.theme_color).toBe('#0E4D98');
    expect(manifest.background_color).toBe('#ffffff');
  });

  it('declares at least one icon with a src and type', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
    const [icon] = manifest.icons;
    expect(icon.src).toBeTruthy();
    expect(icon.type).toBeTruthy();
  });
});

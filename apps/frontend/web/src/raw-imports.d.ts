/**
 * Ambient typing for `.webmanifest` imports. The build/test esbuild pipeline is
 * configured (angular.json `loader`) to load `.webmanifest` as text, so the
 * import resolves to the file's raw string — the manifest spec parses it to
 * assert against the shipped `manifest.webmanifest` (single source of truth).
 */
declare module '*.webmanifest' {
  const content: string;
  export default content;
}

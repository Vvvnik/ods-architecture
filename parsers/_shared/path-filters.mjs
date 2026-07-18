/**
 * Skip paths that are not production HTTP surfaces for the analyzed app.
 * Used by ts-api-routes and ts-http-calls.
 */
export function isTestOrSpecPath(relativePath) {
  const path = String(relativePath).replace(/\\/g, '/');
  if (/(^|\/)(tests|__tests__|__mocks__)(\/|$)/i.test(path)) {
    return true;
  }
  if (/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(path)) {
    return true;
  }
  // Dogfood / monorepo: root parsers/* are ODS CLI modules, not app API code
  if (/^parsers\//i.test(path)) {
    return true;
  }
  return false;
}

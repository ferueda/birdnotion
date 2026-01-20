#!/usr/bin/env node

/**
 * Bumps version in both package.json and manifest.json
 * Usage: node scripts/bump-version.js [major|minor|patch|<version>]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function bumpVersion(currentVersion, type) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      // Assume it's a specific version
      if (/^\d+\.\d+\.\d+/.test(type)) {
        return type;
      }
      throw new Error(`Invalid version type: ${type}. Use major, minor, patch, or a specific version.`);
  }
}

function main() {
  const type = process.argv[2] || 'patch';

  const packagePath = path.join(rootDir, 'package.json');
  const manifestPath = path.join(rootDir, 'manifest.json');

  const packageJson = readJson(packagePath);
  const manifestJson = readJson(manifestPath);

  const currentVersion = packageJson.version;
  const newVersion = bumpVersion(currentVersion, type);

  console.log(`Bumping version: ${currentVersion} → ${newVersion}`);

  // Update package.json
  packageJson.version = newVersion;
  writeJson(packagePath, packageJson);
  console.log(`  Updated package.json`);

  // Update manifest.json
  manifestJson.version = newVersion;
  writeJson(manifestPath, manifestJson);
  console.log(`  Updated manifest.json`);

  console.log(`\nVersion bumped to ${newVersion}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Update CHANGELOG.md`);
  console.log(`  2. git add -A && git commit -m "chore: bump version to ${newVersion}"`);
  console.log(`  3. git tag v${newVersion}`);
  console.log(`  4. git push && git push --tags`);
}

main();

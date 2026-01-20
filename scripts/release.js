#!/usr/bin/env node

/**
 * Creates a new release
 * Usage: node scripts/release.js [major|minor|patch|<version>]
 *
 * This script:
 * 1. Bumps version in package.json and manifest.json
 * 2. Updates CHANGELOG.md
 * 3. Commits the changes
 * 4. Creates a git tag
 * 5. Optionally pushes to remote
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function exec(cmd, options = {}) {
  return execSync(cmd, { cwd: rootDir, encoding: 'utf-8', ...options }).trim();
}

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
      if (/^\d+\.\d+\.\d+/.test(type)) {
        return type;
      }
      throw new Error(`Invalid version type: ${type}`);
  }
}

function getCommitsSinceLastTag() {
  try {
    const lastTag = exec('git describe --tags --abbrev=0 2>/dev/null');
    return exec(`git log ${lastTag}..HEAD --pretty=format:"- %s" --no-merges`);
  } catch {
    // No tags yet, get all commits
    return exec('git log --pretty=format:"- %s" --no-merges');
  }
}

function updateChangelog(version, commits) {
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  const date = new Date().toISOString().split('T')[0];

  const newEntry = `## [${version}] - ${date}\n\n${commits}\n\n`;

  let content = '';
  if (fs.existsSync(changelogPath)) {
    content = fs.readFileSync(changelogPath, 'utf-8');
    // Insert after the header
    const headerEnd = content.indexOf('\n## ');
    if (headerEnd !== -1) {
      content = content.slice(0, headerEnd) + '\n' + newEntry + content.slice(headerEnd + 1);
    } else {
      content += '\n' + newEntry;
    }
  } else {
    content = `# Changelog\n\nAll notable changes to BirdNotion will be documented in this file.\n\n${newEntry}`;
  }

  fs.writeFileSync(changelogPath, content);
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase());
    });
  });
}

async function main() {
  const type = process.argv[2] || 'patch';

  // Check for uncommitted changes
  const status = exec('git status --porcelain');
  if (status) {
    console.error('Error: You have uncommitted changes. Please commit or stash them first.');
    process.exit(1);
  }

  // Get current version and calculate new version
  const packageJson = readJson(path.join(rootDir, 'package.json'));
  const currentVersion = packageJson.version;
  const newVersion = bumpVersion(currentVersion, type);

  console.log(`\nPreparing release: ${currentVersion} → ${newVersion}\n`);

  // Get commits for changelog
  const commits = getCommitsSinceLastTag();
  console.log('Changes to be included:');
  console.log(commits || '  (no commits since last tag)');
  console.log('');

  // Confirm
  const answer = await prompt('Proceed with release? (y/n) ');
  if (answer !== 'y' && answer !== 'yes') {
    console.log('Release cancelled.');
    process.exit(0);
  }

  // Bump versions
  console.log('\n1. Bumping version...');
  packageJson.version = newVersion;
  writeJson(path.join(rootDir, 'package.json'), packageJson);

  const manifestJson = readJson(path.join(rootDir, 'manifest.json'));
  manifestJson.version = newVersion;
  writeJson(path.join(rootDir, 'manifest.json'), manifestJson);

  // Update changelog
  console.log('2. Updating CHANGELOG.md...');
  updateChangelog(newVersion, commits);

  // Git commit
  console.log('3. Creating commit...');
  exec('git add package.json manifest.json CHANGELOG.md');
  exec(`git commit -m "chore: release v${newVersion} [ai assisted]"`);

  // Git tag
  console.log('4. Creating tag...');
  exec(`git tag -a v${newVersion} -m "Release v${newVersion}"`);

  console.log(`\n✓ Release v${newVersion} prepared locally\n`);

  // Push
  const pushAnswer = await prompt('Push to remote? (y/n) ');
  if (pushAnswer === 'y' || pushAnswer === 'yes') {
    console.log('\nPushing to remote...');
    exec('git push');
    exec('git push --tags');
    console.log('✓ Pushed to remote');
    console.log(`\nGitHub Actions will now build and create the release.`);
  } else {
    console.log('\nTo push later, run:');
    console.log('  git push && git push --tags');
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

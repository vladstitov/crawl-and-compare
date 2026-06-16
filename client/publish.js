const fs = require('node:fs');
const path = require('node:path');

const sourceCandidates = [
  path.resolve(__dirname, 'dist/browser'),
  path.resolve(__dirname, 'dist/client/browser'),
];

const sourceDir = sourceCandidates.find((candidate) => fs.existsSync(candidate));
const targetDir = path.resolve(__dirname, '../server/public');

if (!sourceDir) {
  console.error('Source folder not found. Checked:');
  for (const candidate of sourceCandidates) {
    console.error(`- ${candidate}`);
  }
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });

console.log(`Published ${sourceDir} -> ${targetDir}`);

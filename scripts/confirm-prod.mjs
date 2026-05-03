import { createInterface } from 'node:readline';

const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log('');
console.log('\x1b[31m⚠ ⚠ ⚠  PRODUCTION DATABASE OPERATION  ⚠ ⚠ ⚠\x1b[0m');
console.log('');
console.log('You are about to run a command that will modify the LIVE production database.');
console.log('Project: SpearlanceOS (chikljxwgiskyjsnjelf)');
console.log('');

rl.question("Type 'PRODUCTION' (exact case) to confirm, or anything else to abort: ", (answer) => {
  rl.close();
  if (answer === 'PRODUCTION') {
    console.log('✓ Confirmed. Proceeding with production operation.');
    process.exit(0);
  }
  console.log('✗ Aborted. No changes made.');
  process.exit(1);
});

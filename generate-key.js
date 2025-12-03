// Generate a secure 32-byte encryption key
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('hex');
console.log('\n🔑 Your encryption key:');
console.log(key);
console.log('\n⚠️ IMPORTANT: Save this securely - you\'ll need it for Supabase secrets!');
console.log('\nTo use it:');
console.log('  supabase secrets set ENCRYPTION_KEY=' + key);
console.log('\nYou can delete this file after copying the key.\n');

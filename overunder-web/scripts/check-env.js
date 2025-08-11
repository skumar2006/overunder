#!/usr/bin/env node

/**
 * Environment Check Script
 * Run this to verify your environment variables are set up correctly
 * Usage: node scripts/check-env.js
 */

console.log('🔍 Checking environment configuration...\n');

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_PRIVY_APP_ID',
  'NEXT_PUBLIC_CONTRACT_ADDRESS'
];

let allGood = true;

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${value.substring(0, 20)}...`);
  } else {
    console.log(`❌ ${envVar}: NOT SET`);
    allGood = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allGood) {
  console.log('🎉 All required environment variables are set!');
} else {
  console.log('⚠️  Some environment variables are missing.');
  console.log('Please check your .env.local file and ensure all required variables are set.');
}

console.log('\n📋 Required environment variables:');
requiredEnvVars.forEach(envVar => {
  console.log(`   - ${envVar}`);
});

console.log('\n💡 You can find these values in:');
console.log('   - Supabase Dashboard > Settings > API');
console.log('   - Privy Dashboard > Settings');
console.log('   - Your smart contract deployment output');
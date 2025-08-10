#!/usr/bin/env node
/**
 * Test script for the Stock Copy API
 * 
 * Usage examples:
 * - Test dry run: node test-api.js --dry-run
 * - Test with date: node test-api.js --date=2025-08-09
 * - Test production copy: node test-api.js --date=2025-08-09 --production
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.EXTERNAL_API_KEY || 'mata-stock-copy-2025-secure-key';

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || !args.includes('--production');
const dateArg = args.find(arg => arg.startsWith('--date='));
const date = dateArg ? dateArg.split('=')[1] : undefined;

console.log('🧪 Testing Stock Copy API');
console.log(`📍 URL: ${API_BASE_URL}/api/stock/copy`);
console.log(`🔐 API Key: ${API_KEY.substring(0, 10)}...`);
console.log(`📅 Date: ${date || 'auto-detected'}`);
console.log(`🔧 Mode: ${dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
console.log('─'.repeat(50));

// Prepare request data
const requestData = JSON.stringify({
    date: date,
    dryRun: dryRun,
    override: true
});

// Parse URL
const url = new URL(`${API_BASE_URL}/api/external/stock/copy`);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

// Request options
const options = {
    hostname: url.hostname,
    port: url.port || (isHttps ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
        'X-API-Key': API_KEY
    }
};

console.log('📤 Sending request...');

// Make the request
const req = client.request(options, (res) => {
    console.log(`📊 Status: ${res.statusCode} ${res.statusMessage}`);
    console.log(`📋 Headers:`, res.headers);
    console.log('─'.repeat(50));

    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        try {
            const response = JSON.parse(responseData);
            console.log('📥 Response:');
            console.log(JSON.stringify(response, null, 2));

            if (response.success) {
                console.log('\n✅ API Test Successful!');
                if (response.output) {
                    console.log('\n📜 Script Output:');
                    console.log(response.output);
                }
            } else {
                console.log('\n❌ API Test Failed!');
                if (response.errorOutput) {
                    console.log('\n🚨 Error Output:');
                    console.log(response.errorOutput);
                }
            }
        } catch (error) {
            console.error('❌ Failed to parse response:', error.message);
            console.log('Raw response:', responseData);
        }
    });
});

req.on('error', (error) => {
    console.error('💥 Request failed:', error.message);
    process.exit(1);
});

// Send the request
req.write(requestData);
req.end();

console.log('⏳ Waiting for response...');

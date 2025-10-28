#!/usr/bin/env node

/**
 * Download just the Assen (Axle) dataset
 *
 * Run this if the assen dataset failed during bulk download
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Assen dataset
const DATASET = {
    id: '3huj-srit',
    name: 'assen',
    description: 'Axle information',
    format: 'csv',
    estimatedSize: '~200 MB',
    priority: 3
};

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function downloadDataset() {
    const url = `https://opendata.rdw.nl/api/views/${DATASET.id}/rows.csv?accessType=DOWNLOAD`;
    const outputPath = path.join(DATA_DIR, `${DATASET.name}.csv`);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📥 Downloading: ${DATASET.description}`);
    console.log(`   Dataset ID: ${DATASET.id}`);
    console.log(`   Estimated size: ${DATASET.estimatedSize}`);
    console.log(`   URL: ${url}`);
    console.log(`   Output: ${outputPath}`);
    console.log(`${'='.repeat(70)}\n`);

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        let downloadedBytes = 0;
        let lastUpdate = Date.now();

        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Follow redirect
                const redirectUrl = response.headers.location;
                console.log(`↪️  Following redirect to: ${redirectUrl}\n`);

                https.get(redirectUrl, (redirectResponse) => {
                    const totalBytes = parseInt(redirectResponse.headers['content-length'], 10);
                    console.log(`📦 Total size: ${formatBytes(totalBytes)}\n`);

                    redirectResponse.on('data', (chunk) => {
                        downloadedBytes += chunk.length;
                        const now = Date.now();

                        // Update progress every 2 seconds
                        if (now - lastUpdate > 2000) {
                            const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
                            const downloaded = formatBytes(downloadedBytes);
                            const total = formatBytes(totalBytes);
                            process.stdout.write(`\r⏳ Progress: ${progress}% (${downloaded} / ${total})`);
                            lastUpdate = now;
                        }
                    });

                    redirectResponse.pipe(file);

                    file.on('finish', () => {
                        file.close();
                        console.log(`\n✅ Downloaded: ${DATASET.name}.csv (${formatBytes(downloadedBytes)})\n`);
                        resolve();
                    });

                    file.on('error', (err) => {
                        fs.unlink(outputPath, () => {});
                        reject(err);
                    });
                }).on('error', (err) => {
                    reject(err);
                });
            } else if (response.statusCode === 200) {
                const totalBytes = parseInt(response.headers['content-length'], 10);
                console.log(`📦 Total size: ${formatBytes(totalBytes)}\n`);

                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    const now = Date.now();

                    if (now - lastUpdate > 2000) {
                        const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
                        const downloaded = formatBytes(downloadedBytes);
                        const total = formatBytes(totalBytes);
                        process.stdout.write(`\r⏳ Progress: ${progress}% (${downloaded} / ${total})`);
                        lastUpdate = now;
                    }
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    console.log(`\n✅ Downloaded: ${DATASET.name}.csv (${formatBytes(downloadedBytes)})\n`);
                    resolve();
                });

                file.on('error', (err) => {
                    fs.unlink(outputPath, () => {});
                    reject(err);
                });
            } else {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            }
        }).on('error', (err) => {
            fs.unlink(outputPath, () => {});
            reject(err);
        });
    });
}

async function main() {
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║               Download Assen Dataset (Retry)                       ║
╚════════════════════════════════════════════════════════════════════╝
    `);

    const startTime = Date.now();

    try {
        await downloadDataset();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                      Download Complete!                            ║
║                                                                    ║
║  ✅ Success in ${duration} seconds                                    ║
║  Data saved to: ${DATA_DIR.padEnd(52)}║
╚════════════════════════════════════════════════════════════════════╝
        `);
    } catch (error) {
        console.error(`\n❌ Failed to download ${DATASET.name}:`, error.message);
        console.error('\nPlease try again or check your internet connection.\n');
        process.exit(1);
    }
}

main().catch(console.error);

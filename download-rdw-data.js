#!/usr/bin/env node

/**
 * RDW Data Downloader
 *
 * Downloads all RDW datasets to local storage for fast querying
 *
 * WARNING: These datasets are LARGE (15+ million records)
 * The main dataset alone can be several GB
 *
 * Usage:
 *   node download-rdw-data.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const DATA_DIR = path.join(__dirname, 'data');

// All RDW datasets to download
const DATASETS = [
    {
        id: 'm9d7-ebf2',
        name: 'gekentekende_voertuigen',
        description: 'Main vehicle registration (15+ million records)',
        format: 'csv',
        estimatedSize: '~3-5 GB',
        priority: 1
    },
    {
        id: '8ys7-d773',
        name: 'brandstof',
        description: 'Fuel and emissions data',
        format: 'csv',
        estimatedSize: '~500 MB',
        priority: 2
    },
    {
        id: 'vezc-m2t6',
        name: 'carrosserie',
        description: 'Body type information',
        format: 'csv',
        estimatedSize: '~100 MB',
        priority: 2
    },
    {
        id: 'jhie-znh9',
        name: 'carrosserie_specifiek',
        description: 'Detailed body specifications',
        format: 'csv',
        estimatedSize: '~100 MB',
        priority: 3
    },
    {
        id: 'kmfi-hrps',
        name: 'voertuigklasse',
        description: 'Vehicle class data',
        format: 'csv',
        estimatedSize: '~50 MB',
        priority: 3
    },
    {
        id: '3huj-srit',
        name: 'assen',
        description: 'Axle information',
        format: 'csv',
        estimatedSize: '~200 MB',
        priority: 3
    },
    {
        id: 'w4rt-e856',
        name: 'gebreken',
        description: 'Inspection defects',
        format: 'csv',
        estimatedSize: '~500 MB',
        priority: 4
    }
];

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

async function downloadDataset(dataset) {
    const url = `https://opendata.rdw.nl/api/views/${dataset.id}/rows.csv?accessType=DOWNLOAD`;
    const outputPath = path.join(DATA_DIR, `${dataset.name}.csv`);

    console.log(`\n${'='.repeat(70)}`);
    console.log(`📥 Downloading: ${dataset.description}`);
    console.log(`   Dataset ID: ${dataset.id}`);
    console.log(`   Estimated size: ${dataset.estimatedSize}`);
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
                        console.log(`\n✅ Downloaded: ${dataset.name}.csv (${formatBytes(downloadedBytes)})\n`);
                        resolve();
                    });

                    file.on('error', (err) => {
                        fs.unlink(outputPath, () => {});
                        reject(err);
                    });
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
                    console.log(`\n✅ Downloaded: ${dataset.name}.csv (${formatBytes(downloadedBytes)})\n`);
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
║                     RDW Data Downloader                            ║
║                                                                    ║
║  This will download ALL RDW datasets to:                          ║
║  ${DATA_DIR.padEnd(64)}║
║                                                                    ║
║  WARNING: Total size is estimated at 5-10 GB                      ║
║           This will take a while depending on your connection     ║
╚════════════════════════════════════════════════════════════════════╝
    `);

    // Sort by priority
    const sortedDatasets = DATASETS.sort((a, b) => a.priority - b.priority);

    console.log('📋 Datasets to download:\n');
    sortedDatasets.forEach((dataset, index) => {
        console.log(`   ${index + 1}. ${dataset.description} (${dataset.estimatedSize})`);
    });

    console.log('\n⏰ Starting downloads in 3 seconds... (Press Ctrl+C to cancel)\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    const startTime = Date.now();
    let successCount = 0;
    let failCount = 0;

    for (const dataset of sortedDatasets) {
        try {
            await downloadDataset(dataset);
            successCount++;
        } catch (error) {
            console.error(`\n❌ Failed to download ${dataset.name}:`, error.message);
            failCount++;

            // Ask user if they want to continue
            console.log('\n⚠️  Do you want to continue with the next dataset? (Will auto-continue in 5s)');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                      Download Complete!                            ║
║                                                                    ║
║  ✅ Successful: ${successCount.toString().padEnd(54)}║
║  ❌ Failed:     ${failCount.toString().padEnd(54)}║
║  ⏱️  Duration:   ${(duration + ' minutes').padEnd(54)}║
║                                                                    ║
║  Data saved to: ${DATA_DIR.padEnd(52)}║
╚════════════════════════════════════════════════════════════════════╝
    `);

    // Check total disk usage
    let totalSize = 0;
    const files = fs.readdirSync(DATA_DIR);
    files.forEach(file => {
        const filePath = path.join(DATA_DIR, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        console.log(`   📄 ${file.padEnd(40)} ${formatBytes(stats.size)}`);
    });

    console.log(`\n   📊 Total disk usage: ${formatBytes(totalSize)}\n`);
}

main().catch(console.error);

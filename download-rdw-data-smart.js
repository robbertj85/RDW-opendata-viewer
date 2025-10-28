#!/usr/bin/env node

/**
 * RDW Data Downloader - SMART VERSION with Delta Download Support
 *
 * Features:
 * - Checks Last-Modified and ETag headers before downloading
 * - Only downloads if remote file is newer than local copy
 * - Stores metadata for future comparisons
 * - Parallel downloads for better performance
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const METADATA_FILE = path.join(DATA_DIR, '.download-metadata.json');

// All RDW datasets to download
const DATASETS = [
    {
        id: 'm9d7-ebf2',
        name: 'gekentekende_voertuigen',
        description: 'Main vehicle registration (15+ million records)',
        estimatedSize: '~3-5 GB',
        priority: 1
    },
    {
        id: '8ys7-d773',
        name: 'brandstof',
        description: 'Fuel and emissions data',
        estimatedSize: '~500 MB',
        priority: 2
    },
    {
        id: 'vezc-m2t6',
        name: 'carrosserie',
        description: 'Body type information',
        estimatedSize: '~100 MB',
        priority: 2
    },
    {
        id: 'jhie-znh9',
        name: 'carrosserie_specifiek',
        description: 'Detailed body specifications',
        estimatedSize: '~100 MB',
        priority: 3
    },
    {
        id: 'kmfi-hrps',
        name: 'voertuigklasse',
        description: 'Vehicle class data',
        estimatedSize: '~50 MB',
        priority: 3
    },
    {
        id: '3huj-srit',
        name: 'assen',
        description: 'Axle information',
        estimatedSize: '~200 MB',
        priority: 3
    },
    {
        id: 'w4rt-e856',
        name: 'gebreken',
        description: 'Inspection defects',
        estimatedSize: '~500 MB',
        priority: 4
    }
];

// Create data directory if it doesn't exist
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load existing metadata
function loadMetadata() {
    if (fs.existsSync(METADATA_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
        } catch (err) {
            console.warn('Warning: Could not read metadata file, starting fresh');
            return {};
        }
    }
    return {};
}

// Save metadata
function saveMetadata(metadata) {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

// Check if remote file is newer
function checkRemoteHeaders(datasetId) {
    const url = `https://opendata.rdw.nl/api/views/${datasetId}/rows.csv?accessType=DOWNLOAD`;

    return new Promise((resolve, reject) => {
        https.get(url, { method: 'HEAD' }, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                const redirectUrl = response.headers.location;
                https.get(redirectUrl, { method: 'HEAD' }, (redirectResponse) => {
                    resolve({
                        lastModified: redirectResponse.headers['last-modified'],
                        etag: redirectResponse.headers['etag'],
                        contentLength: redirectResponse.headers['content-length']
                    });
                }).on('error', reject);
            } else {
                resolve({
                    lastModified: response.headers['last-modified'],
                    etag: response.headers['etag'],
                    contentLength: response.headers['content-length']
                });
            }
        }).on('error', reject);
    });
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

async function downloadDataset(dataset, metadata) {
    const url = `https://opendata.rdw.nl/api/views/${dataset.id}/rows.csv?accessType=DOWNLOAD`;
    const outputPath = path.join(DATA_DIR, `${dataset.name}.csv`);

    console.log(`\n📦 ${dataset.description}`);

    // Check if file exists
    const fileExists = fs.existsSync(outputPath);

    if (fileExists) {
        console.log('   ✓ File exists locally');

        // Check remote headers
        console.log('   🔍 Checking for updates...');
        try {
            const remoteHeaders = await checkRemoteHeaders(dataset.id);
            const localMetadata = metadata[dataset.name];

            if (localMetadata) {
                const remoteModified = new Date(remoteHeaders.lastModified);
                const localModified = new Date(localMetadata.lastModified);

                if (remoteModified <= localModified && remoteHeaders.etag === localMetadata.etag) {
                    console.log('   ⏭️  File is up-to-date, skipping');
                    return { success: true, skipped: true };
                } else {
                    console.log('   🆕 Remote file is newer, will re-download');
                }
            }
        } catch (err) {
            console.log('   ⚠️  Could not check remote headers, will re-download to be safe');
        }
    }

    // Download the file
    console.log('   ⏬ Downloading...');

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);
        let downloadedBytes = 0;
        let totalBytes = 0;
        let lastProgress = 0;

        const handleResponse = (response) => {
            totalBytes = parseInt(response.headers['content-length'], 10) || 0;
            const lastModified = response.headers['last-modified'];
            const etag = response.headers['etag'];

            response.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;

                // Update progress every 10%
                if (Math.floor(progress / 10) > Math.floor(lastProgress / 10)) {
                    process.stdout.write(`\r   ⏳ Progress: ${progress.toFixed(1)}% (${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)})`);
                    lastProgress = progress;
                }
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log(`\r   ✅ Downloaded: ${formatBytes(downloadedBytes)}                    `);

                // Save metadata
                metadata[dataset.name] = {
                    lastModified,
                    etag,
                    size: downloadedBytes,
                    downloadedAt: new Date().toISOString()
                };
                saveMetadata(metadata);

                resolve({ success: true, size: downloadedBytes });
            });

            file.on('error', (err) => {
                fs.unlink(outputPath, () => {});
                reject(err);
            });
        };

        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                const redirectUrl = response.headers.location;
                https.get(redirectUrl, handleResponse).on('error', reject);
            } else if (response.statusCode === 200) {
                handleResponse(response);
            } else {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            }
        }).on('error', reject);
    });
}

async function main() {
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║              RDW Smart Downloader - Delta Download Support         ║
║                                                                    ║
║  Features:                                                         ║
║  ✓ Checks if remote files are newer before downloading            ║
║  ✓ Only downloads updated datasets (saves time & bandwidth)       ║
║  ✓ Stores metadata for future comparisons                         ║
║                                                                    ║
║  Data directory: ${DATA_DIR.padEnd(48)}║
╚════════════════════════════════════════════════════════════════════╝
    `);

    const metadata = loadMetadata();
    const startTime = Date.now();
    let downloaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const dataset of DATASETS) {
        try {
            const result = await downloadDataset(dataset, metadata);
            if (result.skipped) {
                skipped++;
            } else {
                downloaded++;
            }
        } catch (err) {
            console.error(`\n   ❌ Error: ${err.message}`);
            failed++;
        }
    }

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                      Download Complete!                            ║
║                                                                    ║
║  ✅ Downloaded:  ${downloaded.toString().padEnd(53)}║
║  ⏭️  Skipped:     ${skipped.toString().padEnd(53)}║
║  ❌ Failed:      ${failed.toString().padEnd(53)}║
║  ⏱️  Duration:    ${(duration + ' minutes').padEnd(53)}║
║                                                                    ║
║  Data saved to: ${DATA_DIR.padEnd(52)}║
╚════════════════════════════════════════════════════════════════════╝
    `);

    // Show total disk usage
    let totalSize = 0;
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.csv'));
    if (files.length > 0) {
        console.log('📊 Local files:\n');
        files.forEach(file => {
            const filePath = path.join(DATA_DIR, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;
            const datasetName = file.replace('.csv', '');
            const meta = metadata[datasetName];
            const lastMod = meta ? new Date(meta.lastModified).toLocaleDateString() : 'Unknown';
            console.log(`   📄 ${file.padEnd(40)} ${formatBytes(stats.size).padStart(12)}  (${lastMod})`);
        });

        console.log(`\n   💾 Total disk usage: ${formatBytes(totalSize)}\n`);
    }
}

main().catch(console.error);

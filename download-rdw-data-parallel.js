#!/usr/bin/env node

/**
 * RDW Data Downloader - PARALLEL VERSION
 *
 * Downloads multiple datasets simultaneously for faster completion
 *
 * Usage:
 *   node download-rdw-data-parallel.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

// Number of parallel downloads (adjust based on your connection)
const PARALLEL_DOWNLOADS = 3;

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

// Track download progress for all files
const progressTracker = {};

function updateProgressDisplay() {
    // Clear screen and show all downloads
    process.stdout.write('\x1Bc'); // Clear screen

    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║              RDW Parallel Downloader - Live Status                ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    for (const [name, info] of Object.entries(progressTracker)) {
        const status = info.status;
        const progress = info.progress || 0;
        const downloaded = formatBytes(info.downloaded || 0);
        const total = info.total ? formatBytes(info.total) : 'Unknown';

        let statusIcon = '⏳';
        if (status === 'completed') statusIcon = '✅';
        if (status === 'failed') statusIcon = '❌';
        if (status === 'pending') statusIcon = '⏸️';

        const progressBar = '█'.repeat(Math.floor(progress / 2)) + '░'.repeat(50 - Math.floor(progress / 2));

        console.log(`${statusIcon} ${info.description}`);
        console.log(`   [${progressBar}] ${progress.toFixed(1)}%`);
        console.log(`   ${downloaded} / ${total}\n`);
    }
}

let displayInterval;

async function downloadDataset(dataset, retries = 3) {
    const url = `https://opendata.rdw.nl/api/views/${dataset.id}/rows.csv?accessType=DOWNLOAD`;
    const outputPath = path.join(DATA_DIR, `${dataset.name}.csv`);

    // Initialize progress tracker
    progressTracker[dataset.name] = {
        description: dataset.description,
        status: 'downloading',
        progress: 0,
        downloaded: 0,
        total: 0
    };

    return new Promise((resolve, reject) => {
        const attemptDownload = (attemptsLeft) => {
            const file = fs.createWriteStream(outputPath);
            let downloadedBytes = 0;

            const handleResponse = (response) => {
                const totalBytes = parseInt(response.headers['content-length'], 10) || 0;
                progressTracker[dataset.name].total = totalBytes;

                response.on('data', (chunk) => {
                    downloadedBytes += chunk.length;
                    progressTracker[dataset.name].downloaded = downloadedBytes;
                    progressTracker[dataset.name].progress = totalBytes > 0
                        ? (downloadedBytes / totalBytes) * 100
                        : 0;
                });

                response.pipe(file);

                file.on('finish', () => {
                    file.close();
                    progressTracker[dataset.name].status = 'completed';
                    progressTracker[dataset.name].progress = 100;
                    resolve({ success: true, size: downloadedBytes });
                });

                file.on('error', (err) => {
                    fs.unlink(outputPath, () => {});

                    if (attemptsLeft > 0) {
                        progressTracker[dataset.name].status = 'retrying';
                        setTimeout(() => attemptDownload(attemptsLeft - 1), 2000);
                    } else {
                        progressTracker[dataset.name].status = 'failed';
                        reject(err);
                    }
                });
            };

            https.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    const redirectUrl = response.headers.location;
                    https.get(redirectUrl, handleResponse).on('error', (err) => {
                        if (attemptsLeft > 0) {
                            progressTracker[dataset.name].status = 'retrying';
                            setTimeout(() => attemptDownload(attemptsLeft - 1), 2000);
                        } else {
                            progressTracker[dataset.name].status = 'failed';
                            reject(err);
                        }
                    });
                } else if (response.statusCode === 200) {
                    handleResponse(response);
                } else {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                }
            }).on('error', (err) => {
                if (attemptsLeft > 0) {
                    progressTracker[dataset.name].status = 'retrying';
                    setTimeout(() => attemptDownload(attemptsLeft - 1), 2000);
                } else {
                    progressTracker[dataset.name].status = 'failed';
                    reject(err);
                }
            });
        };

        attemptDownload(retries);
    });
}

async function downloadInParallel(datasets, maxParallel) {
    const results = [];
    const queue = [...datasets];
    const inProgress = [];

    while (queue.length > 0 || inProgress.length > 0) {
        // Fill up to maxParallel downloads
        while (inProgress.length < maxParallel && queue.length > 0) {
            const dataset = queue.shift();

            // Mark as downloading
            const promise = downloadDataset(dataset)
                .then(result => ({ dataset, result, success: true }))
                .catch(error => ({ dataset, error, success: false }));

            inProgress.push(promise);
        }

        // Wait for at least one to complete
        if (inProgress.length > 0) {
            const completed = await Promise.race(inProgress);
            const index = inProgress.indexOf(Promise.resolve(completed));
            inProgress.splice(index, 1);
            results.push(completed);
        }
    }

    return results;
}

async function main() {
    console.log(`
╔════════════════════════════════════════════════════════════════════╗
║              RDW Data Downloader - PARALLEL MODE                   ║
║                                                                    ║
║  This will download ALL RDW datasets in parallel:                 ║
║  ${DATA_DIR.padEnd(64)}║
║                                                                    ║
║  Parallel downloads: ${PARALLEL_DOWNLOADS}                                         ║
║  CPU cores: ${os.cpus().length}                                                  ║
║  WARNING: Total size is estimated at 5-10 GB                      ║
╚════════════════════════════════════════════════════════════════════╝
    `);

    // Check which files already exist
    const existingFiles = [];
    const datasetsToDownload = DATASETS.filter(dataset => {
        const filepath = path.join(DATA_DIR, `${dataset.name}.csv`);
        if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            existingFiles.push({ name: dataset.name, size: stats.size });
            return false;
        }
        return true;
    });

    if (existingFiles.length > 0) {
        console.log('📁 Existing files found (will skip):');
        existingFiles.forEach(f => {
            console.log(`   ✓ ${f.name}.csv (${formatBytes(f.size)})`);
        });
        console.log('');
    }

    if (datasetsToDownload.length === 0) {
        console.log('✅ All datasets already downloaded!\n');
        return;
    }

    console.log(`📋 Datasets to download: ${datasetsToDownload.length}\n`);
    datasetsToDownload.forEach((dataset, index) => {
        console.log(`   ${index + 1}. ${dataset.description} (${dataset.estimatedSize})`);
        progressTracker[dataset.name] = {
            description: dataset.description,
            status: 'pending',
            progress: 0,
            downloaded: 0,
            total: 0
        };
    });

    console.log('\n⏰ Starting parallel downloads in 3 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Start progress display updater
    displayInterval = setInterval(updateProgressDisplay, 500);
    updateProgressDisplay();

    const startTime = Date.now();
    const results = await downloadInParallel(datasetsToDownload, PARALLEL_DOWNLOADS);

    clearInterval(displayInterval);
    updateProgressDisplay(); // Final update

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

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

    // Show failed downloads
    if (failCount > 0) {
        console.log('\n❌ Failed downloads:\n');
        results.filter(r => !r.success).forEach(r => {
            console.log(`   - ${r.dataset.name}: ${r.error.message}`);
        });
        console.log('');
    }

    // Check total disk usage
    let totalSize = 0;
    const files = fs.readdirSync(DATA_DIR);
    console.log('📊 Downloaded files:\n');
    files.forEach(file => {
        const filePath = path.join(DATA_DIR, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        console.log(`   📄 ${file.padEnd(40)} ${formatBytes(stats.size)}`);
    });

    console.log(`\n   💾 Total disk usage: ${formatBytes(totalSize)}\n`);
}

main().catch(console.error);

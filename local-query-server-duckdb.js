#!/usr/bin/env node

/**
 * Local RDW Query Server - DUCKDB VERSION
 *
 * Uses DuckDB for blazing-fast analytical queries on CSV files
 * Perfect for 16GB systems - queries CSV directly without loading into memory!
 *
 * DuckDB is optimized for OLAP (analytical) queries and can:
 * - Query CSV files directly (no conversion needed)
 * - Use columnar storage for fast aggregations
 * - Automatic parallelization across CPU cores
 * - Minimal memory footprint
 *
 * Usage:
 *   node local-query-server-duckdb.js
 *
 * Requirements:
 *   npm install express cors duckdb
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const duckdb = require('duckdb');

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(__dirname, 'rdw.duckdb');

app.use(cors());
app.use(express.json());

// Dataset name mapping
const DATASET_FILES = {
    'm9d7-ebf2': 'gekentekende_voertuigen.csv',
    '8ys7-d773': 'brandstof.csv',
    'vezc-m2t6': 'carrosserie.csv',
    'jhie-znh9': 'carrosserie_specifiek.csv',
    'kmfi-hrps': 'voertuigklasse.csv',
    '3huj-srit': 'assen.csv',
    'w4rt-e856': 'gebreken.csv'
};

// Initialize DuckDB
let db;
let connection;

function initDatabase() {
    return new Promise((resolve, reject) => {
        // Use file-based database for better memory management
        db = new duckdb.Database(DB_PATH, (err) => {
            if (err) {
                reject(err);
                return;
            }

            connection = db.connect();

            // Set memory limits (6GB = ~37% of 16GB for safe operation with Node.js)
            // DuckDB docs recommend 50-60% but we need headroom for Node.js
            connection.run("SET memory_limit='6GB'", (err) => {
                if (err) {
                    console.warn('⚠️  Could not set memory limit:', err.message);
                }
            });

            // Reduce threads to prevent memory spikes (DuckDB recommendation)
            connection.run("SET threads=4", (err) => {
                if (err) {
                    console.warn('⚠️  Could not set threads:', err.message);
                }
            });

            // Set temp directory for spilling to disk
            connection.run("SET temp_directory='./tmp'", (err) => {
                if (err) {
                    console.warn('⚠️  Could not set temp directory:', err.message);
                }
            });

            // Enable aggressive disk spilling for large result sets
            connection.run("SET max_memory='6GB'", (err) => {
                if (err) {
                    console.warn('⚠️  Could not set max_memory:', err.message);
                }
            });

            console.log('✅ DuckDB initialized: 6GB limit, 4 threads, disk spilling enabled\n');
            resolve();
        });
    });
}

// Track which views have been created
const createdViews = new Set();

// Create view for CSV file (DuckDB can query CSV directly)
async function createView(datasetId) {
    const filename = DATASET_FILES[datasetId];
    if (!filename) {
        throw new Error(`Unknown dataset: ${datasetId}`);
    }

    const viewName = `view_${datasetId.replace(/-/g, '_')}`;

    // Return early if already created
    if (createdViews.has(viewName)) {
        return viewName;
    }

    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) {
        throw new Error(`Dataset file not found: ${filename}`);
    }

    return new Promise((resolve, reject) => {
        // DuckDB can read CSV directly with automatic type inference
        // normalize_names=true converts "Kenteken" to "kenteken" and "Eerste kleur" to "eerste_kleur"
        // ignore_errors=true skips malformed rows in CSV files
        const sql = `
            CREATE OR REPLACE VIEW ${viewName} AS
            SELECT * FROM read_csv_auto('${filepath}',
                header=true,
                delim=',',
                quote='"',
                escape='"',
                parallel=true,
                normalize_names=true,
                ignore_errors=true
            )
        `;

        connection.run(sql, (err) => {
            if (err) {
                reject(err);
                return;
            }
            createdViews.add(viewName);
            console.log(`   ✓ Created view: ${viewName}`);
            resolve(viewName);
        });
    });
}

// Create unified view with all datasets joined on kenteken (license plate)
async function createUnifiedView() {
    console.log('\n🔗 Creating unified view with all datasets joined on kenteken...\n');

    // First, create individual views for all available datasets
    const availableDatasets = [];
    for (const [datasetId, filename] of Object.entries(DATASET_FILES)) {
        const filepath = path.join(DATA_DIR, filename);
        if (fs.existsSync(filepath)) {
            try {
                await createView(datasetId);
                availableDatasets.push(datasetId);
            } catch (error) {
                console.error(`   ⚠️  Failed to create view for ${datasetId}:`, error.message);
            }
        }
    }

    if (availableDatasets.length === 0) {
        console.log('   ⚠️  No datasets available for unified view\n');
        return;
    }

    // Build JOIN query
    // Main dataset is the base
    const mainDataset = 'm9d7-ebf2';
    const mainView = `view_${mainDataset.replace(/-/g, '_')}`;

    if (!availableDatasets.includes(mainDataset)) {
        console.log('   ⚠️  Main dataset not available, skipping unified view\n');
        return;
    }

    return new Promise((resolve, reject) => {
        // Create comprehensive joined view
        let sql = `
            CREATE OR REPLACE VIEW view_unified AS
            SELECT
                main.*`;

        // Add LEFT JOINs for other datasets
        const otherDatasets = availableDatasets.filter(id => id !== mainDataset);

        // Add columns from joined tables with prefixes to avoid collisions
        for (const datasetId of otherDatasets) {
            const tableName = datasetId.replace(/-/g, '_');
            const viewName = `view_${tableName}`;

            // Use dataset-specific prefixes for clarity
            const prefix = tableName;
            sql += `,\n                ${viewName}.* `;
        }

        sql += `\n            FROM ${mainView} AS main`;

        // Add LEFT JOINs
        for (const datasetId of otherDatasets) {
            const tableName = datasetId.replace(/-/g, '_');
            const viewName = `view_${tableName}`;
            sql += `\n            LEFT JOIN ${viewName} ON main.kenteken = ${viewName}.kenteken`;
        }

        connection.run(sql, (err) => {
            if (err) {
                console.error('   ❌ Failed to create unified view:', err.message);
                reject(err);
                return;
            }

            console.log('   ✅ Created unified view with all datasets joined on kenteken');
            console.log(`   📊 Joined ${availableDatasets.length} datasets\n`);
            createdViews.add('view_unified');
            resolve('view_unified');
        });
    });
}

// Query DuckDB with direct CSV reading (no views needed - saves memory!)
async function queryDuckDB(datasetId, column, operation, limit) {
    const filename = DATASET_FILES[datasetId];
    if (!filename) {
        throw new Error(`Unknown dataset: ${datasetId}`);
    }

    const filepath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filepath)) {
        throw new Error(`Dataset file not found: ${filename}`);
    }

    console.log(`\n📊 Querying DuckDB: ${filename}`);
    console.log(`   Column: "${column}", Operation: ${operation}`);
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        let sql;

        // Query CSV directly without creating views - more memory efficient!
        if (operation === 'unique') {
            sql = `
                SELECT DISTINCT "${column}"
                FROM read_csv_auto('${filepath}',
                    header=true,
                    normalize_names=true,
                    sample_size=10000,
                    ignore_errors=true
                )
                WHERE "${column}" IS NOT NULL AND "${column}" != ''
                ORDER BY "${column}"
                ${limit === -1 ? '' : (limit > 0 ? `LIMIT ${limit}` : 'LIMIT 1000')}
            `;
        } else if (operation === 'count') {
            sql = `
                SELECT "${column}", COUNT(*) as count
                FROM read_csv_auto('${filepath}',
                    header=true,
                    normalize_names=true,
                    sample_size=10000,
                    ignore_errors=true
                )
                GROUP BY "${column}"
                ORDER BY count DESC
                ${limit === -1 ? '' : (limit > 0 ? `LIMIT ${limit}` : 'LIMIT 1000')}
            `;
        }

        connection.all(sql, (err, rows) => {
            if (err) {
                console.error(`   ❌ Query error:`, err.message);
                reject(err);
                return;
            }

            const duration = ((Date.now() - startTime) / 1000).toFixed(3);
            console.log(`   ⚡ Query completed in ${duration}s (${rows.length} results)\n`);

            // Convert BigInt to Number for JSON serialization
            const processedRows = rows.map(row => {
                const processed = {};
                for (const [key, value] of Object.entries(row)) {
                    processed[key] = typeof value === 'bigint' ? Number(value) : value;
                }
                return processed;
            });

            resolve(processedRows);
        });
    });
}

// Check if data files exist
function checkDataFiles() {
    const missing = [];
    for (const [id, filename] of Object.entries(DATASET_FILES)) {
        const filepath = path.join(DATA_DIR, filename);
        if (!fs.existsSync(filepath)) {
            missing.push(filename);
        }
    }
    return missing;
}

// API endpoint - Query data
app.get('/resource/:datasetId.json', async (req, res) => {
    try {
        const { datasetId } = req.params;
        const { $select, $group, $limit, $order } = req.query;

        console.log(`\n📥 Query received:`);
        console.log(`   Dataset: ${datasetId}`);
        console.log(`   Select: ${$select}`);
        console.log(`   Group: ${$group}`);
        console.log(`   Limit: ${$limit}`);

        // Parse the query
        let column = $select;
        let operation = 'unique';
        // Handle limit: undefined = default 1000, explicit empty string = unlimited (-1), number = that limit
        let limit = $limit === '' ? -1 : (parseInt($limit) || 0);

        if ($select && $select.includes('count(*)')) {
            operation = 'count';
            column = $group || $select.split(',')[0];
        } else if ($group) {
            column = $group;
        }

        // Clean column name
        column = column.replace(/,.*/, '').trim();

        // Query DuckDB
        const data = await queryDuckDB(datasetId, column, operation, limit);

        res.json(data);

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    const missing = checkDataFiles();

    if (missing.length > 0) {
        res.status(503).json({
            status: 'missing_data',
            message: 'Some data files are missing. Run download-rdw-data.js first.',
            missing: missing
        });
    } else {
        res.json({
            status: 'ok',
            mode: 'duckdb',
            message: 'All data files are available',
            datasets: Object.keys(DATASET_FILES).length,
            backend: 'DuckDB (columnar, parallel queries)'
        });
    }
});

// Initialize unified view endpoint
app.post('/init-unified', async (req, res) => {
    try {
        await createUnifiedView();
        res.json({
            message: 'Unified view created successfully',
            description: 'All datasets joined on kenteken (license plate)',
            view: 'view_unified'
        });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Query unified view endpoint
app.get('/unified/:column', async (req, res) => {
    try {
        const { column } = req.params;
        const { limit, operation, pivot } = req.query;

        const limitNum = parseInt(limit) || 100;
        const op = operation || 'count';

        console.log(`\n📊 Querying unified view`);
        console.log(`   Column: "${column}", Operation: ${op}${pivot ? `, Pivot: "${pivot}"` : ''}`);
        const startTime = Date.now();

        // Ensure unified view exists
        if (!createdViews.has('view_unified')) {
            await createUnifiedView();
        }

        return new Promise((resolve, reject) => {
            let sql;

            // If pivot is provided, do a pivot query
            if (pivot) {
                sql = `
                    SELECT
                        "${column}",
                        "${pivot}",
                        COUNT(DISTINCT kenteken) as count
                    FROM view_unified
                    WHERE "${column}" IS NOT NULL
                        AND "${column}" != ''
                        AND "${pivot}" IS NOT NULL
                        AND "${pivot}" != ''
                    GROUP BY "${column}", "${pivot}"
                    ORDER BY count DESC
                    LIMIT ${limitNum}
                `;
            } else if (op === 'unique') {
                sql = `
                    SELECT DISTINCT "${column}"
                    FROM view_unified
                    WHERE "${column}" IS NOT NULL AND "${column}" != ''
                    ORDER BY "${column}"
                    LIMIT ${limitNum}
                `;
            } else if (op === 'count') {
                sql = `
                    SELECT "${column}", COUNT(*) as count
                    FROM view_unified
                    GROUP BY "${column}"
                    ORDER BY count DESC
                    LIMIT ${limitNum}
                `;
            }

            connection.all(sql, (err, rows) => {
                if (err) {
                    console.error(`   ❌ Query error:`, err.message);
                    res.status(500).json({ error: err.message });
                    return;
                }

                const duration = ((Date.now() - startTime) / 1000).toFixed(3);
                console.log(`   ⚡ Query completed in ${duration}s (${rows.length} results)\n`);

                // Convert BigInt to Number for JSON serialization
                const processedRows = rows.map(row => {
                    const processed = {};
                    for (const [key, value] of Object.entries(row)) {
                        processed[key] = typeof value === 'bigint' ? Number(value) : value;
                    }
                    return processed;
                });

                res.json(processedRows);
            });
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Pivot query endpoint - supports cross-dataset analysis
app.get('/pivot', async (req, res) => {
    try {
        const { column, pivotColumn, limit } = req.query;

        if (!column || !pivotColumn) {
            return res.status(400).json({
                error: 'Missing required parameters: column and pivotColumn'
            });
        }

        const limitNum = parseInt(limit) || 1000;

        console.log(`\n📊 Pivot query on unified view`);
        console.log(`   Column: "${column}", Pivot: "${pivotColumn}"`);
        const startTime = Date.now();

        // Ensure unified view exists
        if (!createdViews.has('view_unified')) {
            await createUnifiedView();
        }

        return new Promise((resolve, reject) => {
            // Query for pivot data
            // Use COUNT(DISTINCT kenteken) to avoid double-counting vehicles
            // that appear multiple times due to JOIN cartesian products
            const sql = `
                SELECT
                    "${column}",
                    "${pivotColumn}",
                    COUNT(DISTINCT kenteken) as count
                FROM view_unified
                WHERE "${column}" IS NOT NULL
                    AND "${column}" != ''
                    AND "${pivotColumn}" IS NOT NULL
                    AND "${pivotColumn}" != ''
                GROUP BY "${column}", "${pivotColumn}"
                ORDER BY count DESC
                LIMIT ${limitNum}
            `;

            connection.all(sql, (err, rows) => {
                if (err) {
                    console.error(`   ❌ Pivot query error:`, err.message);
                    res.status(500).json({ error: err.message });
                    return;
                }

                const duration = ((Date.now() - startTime) / 1000).toFixed(3);
                console.log(`   ⚡ Pivot query completed in ${duration}s (${rows.length} results)\n`);

                // Convert BigInt to Number for JSON serialization
                const processedRows = rows.map(row => {
                    const processed = {};
                    for (const [key, value] of Object.entries(row)) {
                        processed[key] = typeof value === 'bigint' ? Number(value) : value;
                    }
                    return processed;
                });

                res.json(processedRows);
            });
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Advanced Pivot endpoint - Excel-like pivot tables with filters, stacking, and multiple aggregations
app.post('/pivot-advanced', async (req, res) => {
    try {
        const {
            rows = [],           // Array of column names for row dimensions (stacking)
            columns = [],        // Array of column names for column dimensions (stacking)
            values = [],         // Array of {column, aggregation} objects for value calculations
            filters = {}         // Object with {columnName: [values]} for filtering
        } = req.body;

        if (rows.length === 0 && columns.length === 0) {
            return res.status(400).json({
                error: 'At least one row or column dimension is required'
            });
        }

        if (values.length === 0) {
            // Default to counting vehicles
            values.push({ column: 'kenteken', aggregation: 'COUNT_DISTINCT' });
        }

        console.log(`\n📊 Advanced Pivot Query`);
        console.log(`   Rows: ${JSON.stringify(rows)}`);
        console.log(`   Columns: ${JSON.stringify(columns)}`);
        console.log(`   Values: ${JSON.stringify(values)}`);
        console.log(`   Filters: ${JSON.stringify(filters)}`);
        const startTime = Date.now();

        // Ensure unified view exists
        if (!createdViews.has('view_unified')) {
            await createUnifiedView();
        }

        return new Promise((resolve, reject) => {
            // Build WHERE clause from filters
            let whereClause = '';
            const filterConditions = [];

            // Process new filter rule format (array of filter objects)
            if (Array.isArray(filters)) {
                filters.forEach(filter => {
                    if (!filter.field || !filter.value) return;

                    const column = filter.field;
                    const operator = filter.operator || 'equals';
                    const value = filter.value;
                    const value2 = filter.value2;

                    // Escape single quotes in values
                    const escapeValue = (v) => v.replace(/'/g, "''");

                    switch (operator) {
                        case 'equals':
                            filterConditions.push(`"${column}" = '${escapeValue(value)}'`);
                            break;
                        case 'not_equals':
                            filterConditions.push(`"${column}" != '${escapeValue(value)}'`);
                            break;
                        case 'greater_than':
                            filterConditions.push(`TRY_CAST("${column}" AS DOUBLE) > ${parseFloat(value)}`);
                            break;
                        case 'less_than':
                            filterConditions.push(`TRY_CAST("${column}" AS DOUBLE) < ${parseFloat(value)}`);
                            break;
                        case 'greater_or_equal':
                            filterConditions.push(`TRY_CAST("${column}" AS DOUBLE) >= ${parseFloat(value)}`);
                            break;
                        case 'less_or_equal':
                            filterConditions.push(`TRY_CAST("${column}" AS DOUBLE) <= ${parseFloat(value)}`);
                            break;
                        case 'between':
                            if (value2) {
                                filterConditions.push(`TRY_CAST("${column}" AS DOUBLE) BETWEEN ${parseFloat(value)} AND ${parseFloat(value2)}`);
                            }
                            break;
                        case 'contains':
                            filterConditions.push(`"${column}" LIKE '%${escapeValue(value)}%'`);
                            break;
                        case 'starts_with':
                            filterConditions.push(`"${column}" LIKE '${escapeValue(value)}%'`);
                            break;
                        case 'ends_with':
                            filterConditions.push(`"${column}" LIKE '%${escapeValue(value)}'`);
                            break;
                    }
                });
            }
            // Support old format for backward compatibility
            else if (typeof filters === 'object' && filters !== null) {
                for (const [column, filterValues] of Object.entries(filters)) {
                    if (Array.isArray(filterValues) && filterValues.length > 0) {
                        const escapedValues = filterValues.map(v => `'${v.replace(/'/g, "''")}'`).join(', ');
                        filterConditions.push(`"${column}" IN (${escapedValues})`);
                    }
                }
            }

            // Add non-null conditions for all dimension columns
            const allDimensions = [...rows, ...columns];
            allDimensions.forEach(col => {
                filterConditions.push(`"${col}" IS NOT NULL AND "${col}" != ''`);
            });

            if (filterConditions.length > 0) {
                whereClause = 'WHERE ' + filterConditions.join(' AND ');
            }

            // Build SELECT clause for dimensions
            const selectDimensions = allDimensions.map(col => `"${col}"`).join(', ');

            // Build SELECT clause for values (aggregations)
            const selectValues = values.map((val, idx) => {
                const { column, aggregation = 'COUNT_DISTINCT' } = val;
                let aggFunc;

                switch (aggregation.toUpperCase()) {
                    case 'COUNT':
                        aggFunc = `COUNT("${column}")`;
                        break;
                    case 'COUNT_DISTINCT':
                        aggFunc = `COUNT(DISTINCT "${column}")`;
                        break;
                    case 'SUM':
                        aggFunc = `SUM(TRY_CAST("${column}" AS DOUBLE))`;
                        break;
                    case 'AVG':
                        aggFunc = `AVG(TRY_CAST("${column}" AS DOUBLE))`;
                        break;
                    case 'MIN':
                        aggFunc = `MIN(TRY_CAST("${column}" AS DOUBLE))`;
                        break;
                    case 'MAX':
                        aggFunc = `MAX(TRY_CAST("${column}" AS DOUBLE))`;
                        break;
                    default:
                        aggFunc = `COUNT(DISTINCT "${column}")`;
                }

                return `${aggFunc} as value_${idx}`;
            }).join(', ');

            // Build GROUP BY clause
            const groupBy = allDimensions.map(col => `"${col}"`).join(', ');

            // Construct final SQL
            const sql = `
                SELECT
                    ${selectDimensions}${selectValues ? ', ' + selectValues : ''}
                FROM view_unified
                ${whereClause}
                GROUP BY ${groupBy}
                ORDER BY ${selectValues.split(' as ')[0]} DESC
                LIMIT 10000
            `;

            console.log(`   SQL: ${sql.substring(0, 200)}...`);

            connection.all(sql, (err, rawRows) => {
                if (err) {
                    console.error(`   ❌ Advanced pivot error:`, err.message);
                    res.status(500).json({ error: err.message });
                    return;
                }

                const duration = ((Date.now() - startTime) / 1000).toFixed(3);
                console.log(`   ⚡ Advanced pivot completed in ${duration}s (${rawRows.length} results)\n`);

                // Convert BigInt to Number for JSON serialization
                const processedRows = rawRows.map(row => {
                    const processed = {};
                    for (const [key, value] of Object.entries(row)) {
                        processed[key] = typeof value === 'bigint' ? Number(value) : value;
                    }
                    return processed;
                });

                res.json({
                    data: processedRows,
                    metadata: {
                        rows,
                        columns,
                        values,
                        filters,
                        rowCount: processedRows.length,
                        executionTime: duration,
                        sql: sql.trim(),
                        totalRecords: processedRows.length
                    }
                });
            });
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get distinct values for a column (for filter dropdowns)
app.get('/distinct-values/:column', async (req, res) => {
    try {
        const { column } = req.params;
        const { limit = 100 } = req.query;

        console.log(`\n📋 Getting distinct values for: ${column}`);
        const startTime = Date.now();

        // Ensure unified view exists
        if (!createdViews.has('view_unified')) {
            await createUnifiedView();
        }

        return new Promise((resolve, reject) => {
            const sql = `
                SELECT DISTINCT "${column}" as value, COUNT(*) as count
                FROM view_unified
                WHERE "${column}" IS NOT NULL AND "${column}" != ''
                GROUP BY "${column}"
                ORDER BY count DESC
                LIMIT ${parseInt(limit)}
            `;

            connection.all(sql, (err, rows) => {
                if (err) {
                    console.error(`   ❌ Error:`, err.message);
                    res.status(500).json({ error: err.message });
                    return;
                }

                const duration = ((Date.now() - startTime) / 1000).toFixed(3);
                console.log(`   ⚡ Found ${rows.length} distinct values in ${duration}s\n`);

                const processedRows = rows.map(row => ({
                    value: row.value,
                    count: typeof row.count === 'bigint' ? Number(row.count) : row.count
                }));

                res.json(processedRows);
            });
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get column schema from unified view
app.get('/schema/unified', async (req, res) => {
    try {
        console.log('\n📋 Getting schema for view_unified');
        const startTime = Date.now();

        // Ensure unified view exists
        if (!createdViews.has('view_unified')) {
            await createUnifiedView();
        }

        return new Promise((resolve, reject) => {
            const sql = `
                SELECT column_name, column_type
                FROM (DESCRIBE SELECT * FROM view_unified)
                ORDER BY column_name
            `;

            connection.all(sql, (err, rows) => {
                if (err) {
                    console.error(`   ❌ Schema error:`, err.message);
                    res.status(500).json({ error: err.message });
                    return;
                }

                const duration = ((Date.now() - startTime) / 1000).toFixed(3);
                console.log(`   ✅ Found ${rows.length} columns in ${duration}s\n`);

                const columns = rows.map(row => ({
                    name: row.column_name,
                    type: row.column_type
                }));

                res.json(columns);
            });
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// License plate lookup endpoint - get all data for a single vehicle
app.get('/vehicle/:kenteken', async (req, res) => {
    try {
        const { kenteken } = req.params;

        if (!kenteken) {
            return res.status(400).json({
                error: 'Missing required parameter: kenteken (license plate)'
            });
        }

        console.log(`\n🚗 Vehicle lookup: ${kenteken}`);
        const startTime = Date.now();

        // Ensure unified view exists
        if (!createdViews.has('view_unified')) {
            await createUnifiedView();
        }

        return new Promise((resolve, reject) => {
            const sql = `
                SELECT *
                FROM view_unified
                WHERE UPPER(kenteken) = UPPER('${kenteken}')
                LIMIT 1
            `;

            connection.all(sql, (err, rows) => {
                if (err) {
                    console.error(`   ❌ Vehicle lookup error:`, err.message);
                    res.status(500).json({ error: err.message });
                    return;
                }

                const duration = ((Date.now() - startTime) / 1000).toFixed(3);

                if (rows.length === 0) {
                    console.log(`   ⚠️  No vehicle found with kenteken: ${kenteken} (${duration}s)\n`);
                    res.status(404).json({
                        error: 'Vehicle not found',
                        kenteken: kenteken
                    });
                    return;
                }

                console.log(`   ✅ Vehicle found in ${duration}s\n`);

                // Convert BigInt to Number for JSON serialization
                const processedRow = {};
                for (const [key, value] of Object.entries(rows[0])) {
                    processedRow[key] = typeof value === 'bigint' ? Number(value) : value;
                }

                res.json(processedRow);
            });
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// License plate lookup endpoint (returns array format for consistency with other endpoints)
app.get('/kenteken/:kenteken', async (req, res) => {
    try {
        const { kenteken } = req.params;

        if (!kenteken) {
            return res.status(400).json({
                error: 'Missing required parameter: kenteken (license plate)'
            });
        }

        console.log(`\n🔍 License plate lookup: ${kenteken}`);
        const startTime = Date.now();

        // Ensure unified view exists
        if (!createdViews.has('view_unified')) {
            await createUnifiedView();
        }

        return new Promise((resolve, reject) => {
            const sql = `
                SELECT *
                FROM view_unified
                WHERE UPPER(kenteken) = UPPER('${kenteken}')
                LIMIT 1
            `;

            connection.all(sql, (err, rows) => {
                if (err) {
                    console.error(`   ❌ License plate lookup error:`, err.message);
                    res.status(500).json({ error: err.message });
                    return;
                }

                const duration = ((Date.now() - startTime) / 1000).toFixed(3);

                if (rows.length === 0) {
                    console.log(`   ⚠️  No vehicle found with kenteken: ${kenteken} (${duration}s)\n`);
                    res.status(404).json({
                        error: 'Vehicle not found',
                        kenteken: kenteken,
                        result: []
                    });
                    return;
                }

                console.log(`   ✅ Vehicle found in ${duration}s\n`);

                // Convert BigInt to Number for JSON serialization
                const processedRows = rows.map(row => {
                    const processedRow = {};
                    for (const [key, value] of Object.entries(row)) {
                        processedRow[key] = typeof value === 'bigint' ? Number(value) : value;
                    }
                    return processedRow;
                });

                res.json({ result: processedRows });
            });
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// N2 Vehicle Analysis endpoint - analyze N2 vehicles by mass range and fuel type
app.get('/analyze/n2-by-fuel', async (req, res) => {
    try {
        const { minMass, maxMass } = req.query;

        const min = parseInt(minMass) || 3500;
        const max = parseInt(maxMass) || 4250;

        console.log(`\n📊 Analyzing N2 vehicles (${min}-${max}kg) by fuel type`);
        const startTime = Date.now();

        // Ensure unified view exists
        if (!createdViews.has('view_unified')) {
            await createUnifiedView();
        }

        return new Promise((resolve, reject) => {
            const sql = `
                SELECT
                    brandstof_omschrijving,
                    COUNT(DISTINCT kenteken) as vehicle_count
                FROM view_unified
                WHERE UPPER(europese_voertuigcategorie) = 'N2'
                    AND CAST(toegestane_maximum_massa_voertuig AS INTEGER) >= ${min}
                    AND CAST(toegestane_maximum_massa_voertuig AS INTEGER) <= ${max}
                    AND brandstof_omschrijving IS NOT NULL
                    AND brandstof_omschrijving != ''
                GROUP BY brandstof_omschrijving
                ORDER BY vehicle_count DESC
            `;

            connection.all(sql, (err, rows) => {
                if (err) {
                    console.error(`   ❌ Analysis error:`, err.message);
                    res.status(500).json({ error: err.message });
                    return;
                }

                const duration = ((Date.now() - startTime) / 1000).toFixed(3);

                // Convert BigInt to Number and calculate totals
                const processedRows = rows.map(row => ({
                    fuel_type: row.brandstof_omschrijving,
                    count: typeof row.vehicle_count === 'bigint' ? Number(row.vehicle_count) : row.vehicle_count
                }));

                const totalVehicles = processedRows.reduce((sum, row) => sum + row.count, 0);

                // Add percentages
                const resultsWithPercentages = processedRows.map(row => ({
                    ...row,
                    percentage: parseFloat(((row.count / totalVehicles) * 100).toFixed(2))
                }));

                console.log(`   ⚡ Analysis completed in ${duration}s (${totalVehicles} vehicles found)\n`);

                res.json({
                    filters: {
                        vehicle_class: 'N2',
                        min_mass_kg: min,
                        max_mass_kg: max
                    },
                    total_vehicles: totalVehicles,
                    fuel_types: resultsWithPercentages,
                    execution_time_seconds: parseFloat(duration)
                });
            });
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// N1/N2 Vehicle List endpoint - get detailed list of N1 and N2 vehicles by mass range
app.get('/analyze/n2-vehicles', async (req, res) => {
    try {
        const { minMass, maxMass, format, categories } = req.query;

        const min = parseInt(minMass) || 3250;
        const max = parseInt(maxMass) || 4250;

        // Default to N2 only, but allow N1,N2 or both
        const vehicleCategories = categories ? categories.split(',').map(c => c.trim().toUpperCase()) : ['N2'];

        console.log(`\n📊 Fetching ${vehicleCategories.join(', ')} vehicle list (${min}-${max}kg)`);
        const startTime = Date.now();

        // Ensure unified view exists
        if (!createdViews.has('view_unified')) {
            await createUnifiedView();
        }

        return new Promise((resolve, reject) => {
            const categoryFilter = vehicleCategories.map(c => `UPPER(europese_voertuigcategorie) = '${c}'`).join(' OR ');

            const sql = `
                SELECT DISTINCT
                    kenteken,
                    europese_voertuigcategorie,
                    brandstof_omschrijving,
                    toegestane_maximum_massa_voertuig,
                    merk,
                    handelsbenaming
                FROM view_unified
                WHERE (${categoryFilter})
                    AND CAST(toegestane_maximum_massa_voertuig AS INTEGER) >= ${min}
                    AND CAST(toegestane_maximum_massa_voertuig AS INTEGER) <= ${max}
                ORDER BY europese_voertuigcategorie, kenteken
            `;

            connection.all(sql, (err, rows) => {
                if (err) {
                    console.error(`   ❌ Query error:`, err.message);
                    res.status(500).json({ error: err.message });
                    return;
                }

                const duration = ((Date.now() - startTime) / 1000).toFixed(3);
                console.log(`   ⚡ Query completed in ${duration}s (${rows.length} vehicles found)\n`);

                // Convert BigInt to Number
                const processedRows = rows.map(row => {
                    const processed = {};
                    for (const [key, value] of Object.entries(row)) {
                        processed[key] = typeof value === 'bigint' ? Number(value) : value;
                    }
                    return processed;
                });

                // Return CSV format if requested
                if (format === 'csv') {
                    const headers = ['kenteken', 'europese_voertuigcategorie', 'brandstof_omschrijving', 'toegestane_maximum_massa_voertuig', 'merk', 'handelsbenaming'];
                    const csvRows = [headers.join(',')];

                    processedRows.forEach(row => {
                        const values = headers.map(header => {
                            const val = row[header] || '';
                            // Escape values containing commas or quotes
                            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                                return `"${val.replace(/"/g, '""')}"`;
                            }
                            return val;
                        });
                        csvRows.push(values.join(','));
                    });

                    res.setHeader('Content-Type', 'text/csv');
                    res.setHeader('Content-Disposition', `attachment; filename="n2_vehicles_${min}-${max}kg.csv"`);
                    res.send(csvRows.join('\n'));
                } else {
                    res.json({
                        filters: {
                            vehicle_class: 'N2',
                            min_mass_kg: min,
                            max_mass_kg: max
                        },
                        total_vehicles: processedRows.length,
                        vehicles: processedRows,
                        execution_time_seconds: parseFloat(duration)
                    });
                }
            });
        });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Info endpoint
app.get('/info', (req, res) => {
    const files = Object.entries(DATASET_FILES).map(([id, filename]) => {
        const filepath = path.join(DATA_DIR, filename);
        const exists = fs.existsSync(filepath);
        const size = exists ? fs.statSync(filepath).size : 0;

        return {
            id,
            filename,
            exists,
            size: (size / 1024 / 1024).toFixed(2) + ' MB'
        };
    });

    res.json({
        mode: 'duckdb',
        description: 'DuckDB-powered analytical queries on CSV files',
        features: [
            'Direct CSV querying (no import needed)',
            'Columnar storage for fast aggregations',
            'Automatic parallelization',
            'Minimal memory footprint',
            'Perfect for 16GB systems',
            'All datasets joined on kenteken (license plate)'
        ],
        relationships: {
            primaryKey: 'kenteken',
            description: 'All datasets can be joined via kenteken (license plate number)',
            datasets: Object.keys(DATASET_FILES)
        },
        datasets: files,
        views: {
            individual: 'Each dataset has its own view (view_{dataset-id})',
            unified: 'All datasets joined in view_unified'
        }
    });
});

// Start server
async function startServer() {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║         Local RDW Query Server - DUCKDB MODE                    ║
║                                                                  ║
║  Running on: http://localhost:${PORT}                              ║
║  Data dir:   ${DATA_DIR.padEnd(50)}║
║                                                                  ║
║  ⚡ DUCKDB - Blazing Fast Analytical Queries!                   ║
║                                                                  ║
║  Features:                                                       ║
║  • Direct CSV querying (no conversion)                          ║
║  • Columnar storage                                             ║
║  • Multi-core parallelization                                   ║
║  • Low memory usage (~2-4 GB)                                   ║
║  • All datasets joined on kenteken                              ║
║                                                                  ║
║  Endpoints:                                                      ║
║  • Query dataset:   GET  /resource/{dataset-id}.json            ║
║  • Query unified:   GET  /unified/{column}?operation=count      ║
║  • Init unified:    POST /init-unified                          ║
║  • Health:          GET  /health                                ║
║  • Info:            GET  /info                                  ║
╚══════════════════════════════════════════════════════════════════╝
    `);

    try {
        await initDatabase();

        const missing = checkDataFiles();
        if (missing.length > 0) {
            console.log(`⚠️  WARNING: Missing data files:\n`);
            missing.forEach(file => console.log(`   ❌ ${file}`));
            console.log(`\n   Run: npm run download\n`);
        } else {
            console.log(`✅ All ${Object.keys(DATASET_FILES).length} datasets are available!\n`);
        }

        console.log('🚀 DuckDB query server is ready!');
        console.log('💡 Queries will be executed directly on CSV files with columnar optimization');
        console.log('');
        console.log('🔗 RELATIONSHIPS:');
        console.log('   All datasets are related via "kenteken" (license plate)');
        console.log('   You can query individual datasets OR the unified joined view');
        console.log('');
        console.log('   To create unified view:');
        console.log('   curl -X POST http://localhost:3001/init-unified');
        console.log('');
        console.log('   Example unified query:');
        console.log('   curl "http://localhost:3001/unified/merk?operation=count&limit=10"');
        console.log('');

        app.listen(PORT);

        // Optionally auto-create unified view on startup
        // Uncomment to enable:
        // setTimeout(() => createUnifiedView().catch(console.error), 2000);

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down...\n');
    if (connection) {
        connection.close(() => {
            if (db) {
                db.close(() => {
                    console.log('✅ DuckDB closed cleanly\n');
                    process.exit(0);
                });
            }
        });
    } else {
        process.exit(0);
    }
});

startServer();

const pool = require("./src/config/db");

const createTablesSQL = `

CREATE TABLE IF NOT EXISTS mines (
    id SERIAL PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    registration_number VARCHAR(100)
        UNIQUE NOT NULL,

    location TEXT,

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    email VARCHAR(255)
        UNIQUE NOT NULL,

    password VARCHAR(255)
        NOT NULL,

    role VARCHAR(50)
        NOT NULL DEFAULT 'MINE',

    mine_id INTEGER
        REFERENCES mines(id)
        ON DELETE SET NULL,

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_role
        CHECK (
            role IN (
                'ADMIN',
                'MINE',
                'SPECIALIST',
                'REGULATOR'
            )
        )
);


CREATE TABLE IF NOT EXISTS rehabilitation_zones (
    id SERIAL PRIMARY KEY,

    mine_id INTEGER NOT NULL
        REFERENCES mines(id)
        ON DELETE CASCADE,

    name VARCHAR(150) NOT NULL,

    area_hectares DECIMAL(12,2),

    latitude DECIMAL(10,7),

    longitude DECIMAL(10,7),

    status VARCHAR(50)
        DEFAULT 'ACTIVE',

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS rehabilitation_activities (
    id SERIAL PRIMARY KEY,

    zone_id INTEGER NOT NULL
        REFERENCES rehabilitation_zones(id)
        ON DELETE CASCADE,

    activity_type VARCHAR(100) NOT NULL,

    description TEXT,

    measurement DECIMAL(12,2),

    unit VARCHAR(50),

    performed_by VARCHAR(150),

    activity_date DATE NOT NULL,

    status VARCHAR(50)
        DEFAULT 'PENDING',

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS evidence (
    id SERIAL PRIMARY KEY,

    activity_id INTEGER NOT NULL
        REFERENCES rehabilitation_activities(id)
        ON DELETE CASCADE,

    file_name VARCHAR(255) NOT NULL,

    file_url TEXT NOT NULL,

    sha256_hash VARCHAR(64) NOT NULL,

    uploaded_by INTEGER
        REFERENCES users(id)
        ON DELETE SET NULL,

    uploaded_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,

    activity_id INTEGER NOT NULL
        REFERENCES rehabilitation_activities(id)
        ON DELETE CASCADE,

    review_token VARCHAR(255)
        UNIQUE NOT NULL,

    reviewer_type VARCHAR(50) NOT NULL,

    status VARCHAR(50)
        DEFAULT 'PENDING',

    comments TEXT,

    reviewed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invitations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    mine_id INTEGER REFERENCES mines(id) ON DELETE SET NULL,
    invitation_token VARCHAR(64) UNIQUE NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    token_expires_at TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);


CREATE TABLE IF NOT EXISTS registration_requests (
    id SERIAL PRIMARY KEY,

    name VARCHAR(255) NOT NULL,

    email VARCHAR(255) NOT NULL,

    requested_role VARCHAR(50) NOT NULL,

    requested_mine_id INTEGER
        REFERENCES mines(id)
        ON DELETE SET NULL,

    reason TEXT,

    status VARCHAR(50)
        NOT NULL DEFAULT 'PENDING',

    /*
     * SHA-256 hash of the invitation token.
     * The raw token is only sent to the applicant.
     */
    approval_token VARCHAR(255),

    /*
     * bcrypt hash of the 6-digit OTP.
     */
    otp_hash VARCHAR(255),

    /*
     * Invitation/OTP expiration time.
     */
    token_expires_at TIMESTAMP,

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    reviewed_at TIMESTAMP
);

`;


// ============================================================
// SEED MINES
// ============================================================

const seedMinesSQL = `

INSERT INTO mines
(
    name,
    registration_number,
    location
)
VALUES

(
    'Golden Ridge Coal Mine',
    'MP-2011-00456',
    'Middelburg, Mpumalanga'
),

(
    'Vaal River Colliery',
    'MP-2008-00932',
    'Secunda, Mpumalanga'
),

(
    'Highveld Coal Operations',
    'MP-2015-01123',
    'Ermelo, Mpumalanga'
),

(
    'Sunrise Platinum Mine',
    'LP-2013-00789',
    'Mokopane, Limpopo'
),

(
    'Karoo Iron Ore Mine',
    'NC-2009-00341',
    'Postmasburg, Northern Cape'
),

(
    'Witbank Coal Reserves',
    'MP-2005-00187',
    'Witbank, Mpumalanga'
),

(
    'Rustenburg Chrome Mine',
    'NW-2017-00602',
    'Rustenburg, North West'
),

(
    'Free State Gold Operations',
    'FS-2003-00098',
    'Welkom, Free State'
),

(
    'Northern Cape Manganese Mine',
    'NC-2019-01245',
    'Kuruman, Northern Cape'
),

(
    'Ekurhuleni Sand Mining Co',
    'GP-2014-00873',
    'Benoni, Gauteng'
)

ON CONFLICT (registration_number)
DO NOTHING;

`;


// ============================================================
// SEED REHABILITATION ZONES
// ============================================================

const seedZonesSQL = `

INSERT INTO rehabilitation_zones
(
    mine_id,
    name,
    area_hectares,
    latitude,
    longitude,
    status
)

SELECT
    m.id,
    z.name,
    z.area_hectares,
    z.latitude,
    z.longitude,
    z.status

FROM
(
    VALUES

    (
        'MP-2011-00456',
        'North Pit Rehabilitation Zone',
        45.30,
        -25.7768,
        29.4644,
        'ACTIVE'
    ),

    (
        'MP-2011-00456',
        'Tailings Dam Closure Area',
        12.75,
        -25.7810,
        29.4590,
        'MONITORING'
    ),

    (
        'MP-2008-00932',
        'East Overburden Zone',
        60.10,
        -26.5225,
        29.1725,
        'ACTIVE'
    ),

    (
        'MP-2015-01123',
        'Central Void Backfill Area',
        33.40,
        -26.5307,
        29.9877,
        'ACTIVE'
    ),

    (
        'LP-2013-00789',
        'Platinum Waste Rock Dump',
        28.65,
        -24.1954,
        29.0106,
        'MONITORING'
    ),

    (
        'NC-2009-00341',
        'Iron Ore Open Pit Zone A',
        75.20,
        -28.3187,
        23.0629,
        'ACTIVE'
    ),

    (
        'MP-2005-00187',
        'Legacy Shaft Closure Zone',
        15.90,
        -25.8709,
        29.1929,
        'COMPLETED'
    ),

    (
        'NW-2017-00602',
        'Chrome Tailings Rehabilitation',
        22.35,
        -25.6672,
        27.2424,
        'ACTIVE'
    ),

    (
        'FS-2003-00098',
        'Gold Mine Void Zone 3',
        40.00,
        -27.9769,
        26.7359,
        'MONITORING'
    ),

    (
        'GP-2014-00873',
        'Sand Extraction Restoration Site',
        8.50,
        -26.1885,
        28.3208,
        'ACTIVE'
    )

) AS z(
    reg_number,
    name,
    area_hectares,
    latitude,
    longitude,
    status
)

JOIN mines m
    ON m.registration_number = z.reg_number

WHERE NOT EXISTS (

    SELECT 1
    FROM rehabilitation_zones rz

    WHERE rz.mine_id = m.id

    AND rz.name = z.name

);

`;


// ============================================================
// DATABASE INITIALIZATION
// ============================================================

async function initializeDatabase() {

    try {

        console.log(
            "Initializing RehabLedger database..."
        );


        // ----------------------------------------------------
        // Create tables
        // ----------------------------------------------------

        console.log(
            "Creating/verifying database tables..."
        );

        await pool.query(
            createTablesSQL
        );

        console.log(
            "All tables verified successfully."
        );


        // ----------------------------------------------------
        // Make sure OTP column exists
        // ----------------------------------------------------

        await pool.query(`
            ALTER TABLE registration_requests
            ADD COLUMN IF NOT EXISTS otp_hash VARCHAR(255);
        `);

        console.log(
            "Registration OTP field verified."
        );


        // ----------------------------------------------------
        // Seed mines
        // ----------------------------------------------------

        console.log(
            "Seeding mines..."
        );

        await pool.query(
            seedMinesSQL
        );

        console.log(
            "Mines seeded successfully."
        );


        // ----------------------------------------------------
        // Seed rehabilitation zones
        // ----------------------------------------------------

        console.log(
            "Seeding rehabilitation zones..."
        );

        await pool.query(
            seedZonesSQL
        );

        console.log(
            "Rehabilitation zones seeded successfully."
        );


        console.log(
            "🎉 RehabLedger database initialization complete!"
        );

    } catch (error) {

        console.error(
            "❌ Database initialization error:"
        );

        console.error(
            error
        );

    } finally {

        await pool.end();

        console.log(
            "Database connection closed."
        );

        process.exit(0);
    }
}


initializeDatabase();
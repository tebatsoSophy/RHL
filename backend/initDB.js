const pool= require("./src/config/db");

const createTablesSQL = `
CREATE TABLE IF NOT EXISTS mines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    location TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'MINE',
    mine_id INTEGER REFERENCES mines(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rehabilitation_zones (
    id SERIAL PRIMARY KEY,
    mine_id INTEGER NOT NULL REFERENCES mines(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    area_hectares DECIMAL(12,2),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rehabilitation_activities (
    id SERIAL PRIMARY KEY,
    zone_id INTEGER NOT NULL REFERENCES rehabilitation_zones(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    description TEXT,
    measurement DECIMAL(12,2),
    unit VARCHAR(50),
    performed_by VARCHAR(150),
    activity_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evidence (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES rehabilitation_activities(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES rehabilitation_activities(id) ON DELETE CASCADE,
    review_token VARCHAR(255) UNIQUE NOT NULL,
    reviewer_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    comments TEXT,
    reviewed_at TIMESTAMP
);
`;

async function initializeDatabase() {
  try {
    console.log("Initializing database tables...");
    
    // Execute the SQL queries
    await pool.query(createTablesSQL);
    
    console.log("🎉 All tables verified and created successfully!");
  } catch (error) {
    console.error("❌ Error initializing database:", error.message);
  } finally {
    // Close the pool connection so the Node process can exit cleanly
    await pool.end();
    process.exit(0);
  }
}

initializeDatabase();
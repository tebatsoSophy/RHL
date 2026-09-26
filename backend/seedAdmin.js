const pool = require("./src/config/db");
const bcrypt = require("bcrypt");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function seedAdmin() {
  try {
    const name = (await ask("Admin name: ")).trim();
    const email = (await ask("Admin email: ")).trim().toLowerCase();
    const password = await ask("Admin password: ");
    const registrationNumber = (
      await ask("Mine registration number: ")
    ).trim();

    // Check whether user already exists
    const existingUser = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log("A user with this email already exists.");
      return;
    }

    // Find the mine
    const mineResult = await pool.query(
      `SELECT id, name, registration_number
       FROM mines
       WHERE registration_number = $1`,
      [registrationNumber]
    );

    if (mineResult.rows.length === 0) {
      console.log("No mine was found with that registration number.");
      return;
    }

    const mine = mineResult.rows[0];

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create admin
    const result = await pool.query(
      `INSERT INTO users
       (name, email, password, role, mine_id)
       VALUES ($1, $2, $3, 'ADMIN', $4)
       RETURNING id, name, email, role, mine_id, created_at`,
      [name, email, passwordHash, mine.id]
    );

    console.log("\n✅ Admin created successfully!");
    console.log("Admin:", result.rows[0]);
    console.log(`Mine: ${mine.name}`);
  } catch (err) {
    console.error("❌ Failed to seed admin:", err.message);
  } finally {
    rl.close();
    await pool.end();
  }
}

seedAdmin();
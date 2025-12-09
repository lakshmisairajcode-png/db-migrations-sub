const fs = require("fs");
const path = require("path");
const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://sairaj-dev:etQE2lpdMMYXXR7L@cluster0.0xaeq.mongodb.net/";

const dbName = "CE_DEV_V01";

// Folder where scripts are stored (we support nested folders)
const baseDir = path.join(__dirname, "..", "scripts");

// Collection used to track applied migrations
const changelogCollectionName = "migration_changelog";

function getAllMigrationFiles(dir) {
  let results = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(getAllMigrationFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      results.push(fullPath);
    }
  }
  return results;
}

async function run() {
  console.log("Connecting to MongoDB:", uri);
  console.log("Database:", dbName);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const changelog = db.collection(changelogCollectionName);

  const files = getAllMigrationFiles(baseDir).sort();
  console.log("Found migration files:");
  files.forEach((f) => console.log(" -", path.relative(baseDir, f)));

  for (const filePath of files) {
    const relativeName = path.relative(baseDir, filePath); // used as ID

    const already = await changelog.findOne({ id: relativeName });
    if (already) {
      console.log("Skipping already applied migration:", relativeName);
      continue;
    }

    console.log("Running migration:", relativeName);
    const migration = require(filePath);

    if (!migration || typeof migration.up !== "function") {
      console.log("No up() function found in", relativeName, "- skipping");
      continue;
    }

    try {
      await migration.up(db, client);
      await changelog.insertOne({
        id: relativeName,
        appliedAt: new Date(),
        file: relativeName
      });
      console.log("Finished migration:", relativeName);
    } catch (err) {
      console.error("Migration failed:", relativeName);
      console.error(err);
      await client.close();
      process.exit(1);
    }
  }

  console.log("All migrations completed.");
  await client.close();
}

run().catch((err) => {
  console.error("Migration run failed:", err);
  process.exit(1);
});

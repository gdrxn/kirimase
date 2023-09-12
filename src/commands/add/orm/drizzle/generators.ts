import { consola } from "consola";
import fs from "fs";
import path from "path";
import {
  createFile,
  installPackages,
  readConfigFile,
} from "../../../../utils.js";
import { DBProvider, DBType, PMType } from "../../../../types.js";

type ConfigDriver = "pg" | "turso" | "libsql" | "mysql" | "better-sqlite";

const configDriverMappings = {
  postgresjs: "pg",
  "node-postgres": "pg",
  "vercel-pg": "pg",
  neon: "pg",
  supabase: "pg",
  aws: "pg",
  planetscale: "mysql2",
  "mysql-2": "mysql2",
  "better-sqlite3": "better-sqlite",
};

export const createDrizzleConfig = (libPath: string, provider: DBProvider) => {
  createFile(
    "drizzle.config.ts",
    `import type { Config } from "drizzle-kit";
import "dotenv/config";

export default {
  schema: "./${libPath}/db/schema",
  out: "./${libPath}/db/migrations",
  driver: "${configDriverMappings[provider]}",
  dbCredentials: {
    ${
      provider == "better-sqlite3"
        ? "url: process.env.DATABASE_URL!"
        : "connectionString: process.env.DATABASE_URL!"
    },
  }
} satisfies Config;`
  );
};

export const createIndexTs = (
  libPath: string,
  dbType: DBType,
  dbProvider: DBProvider
) => {
  let indexTS = "";
  switch (dbProvider) {
    case "postgresjs":
      indexTS = `import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import "dotenv/config";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);`;
      break;
    case "node-postgres":
      indexTS = `import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg"
import "dotenv/config";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});
export const db = drizzle(pool);`;
      break;
    case "neon":
      indexTS = `import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import "dotenv/config";

neonConfig.fetchConnectionCache = true;
 
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);
`;
      break;
    case "vercel-pg":
      indexTS = `import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import "dotenv/config";
 
export const db = drizzle(sql)
`;
      break;
    case "supabase":
      indexTS = `import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import "dotenv/config";
 
const connectionString = process.env.DATABASE_URL!
const client = postgres(connectionString)
export const db = drizzle(client);
`;
      break;
    case "aws":
      indexTS = `import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { fromIni } from '@aws-sdk/credential-providers';
import "dotenv/config";

 
const rdsClient = new RDSDataClient({
  	credentials: fromIni({ profile: process.env['PROFILE'] }),
		region: 'us-east-1',
});
 
export const db = drizzle(rdsClient, {
  database: process.env['DATABASE']!,
  secretArn: process.env['SECRET_ARN']!,
  resourceArn: process.env['RESOURCE_ARN']!,
});
`;
      break;
    case "planetscale":
      indexTS = `import { drizzle } from "drizzle-orm/planetscale-serverless";
import { connect } from "@planetscale/database";
import "dotenv/config";
 
// create the connection
const connection = connect({
  url: process.env.DATABASE_URL!
});
 
export const db = drizzle(connection);
`;
      break;
    case "mysql-2":
      indexTS = `import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import "dotenv/config";
 
const poolConnection = mysql.createPool(process.env.DATABASE_URL!);
 
export const db = drizzle(poolConnection);
`;
      break;
    case "better-sqlite3":
      indexTS = `import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
 
const sqlite = new Database('sqlite.db');
export const db: BetterSQLite3Database = drizzle(sqlite);
`;
      break;
    // case "bun-sqlite":
    //   indexTS = `import { drizzle, BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
    // import { Database } from 'bun:sqlite';
    //
    // const sqlite = new Database('sqlite.db');
    // export const db: BunSQLiteDatabase = drizzle(sqlite);
    // `;
    //   break;
    default:
      break;
  }

  createFile(`${libPath}/db/index.ts`, indexTS);
};

export const createMigrateTs = (
  libPath: string,
  dbType: DBType,
  dbProvider: DBProvider
) => {
  let imports = "";
  let connectionLogic = "";

  switch (dbProvider) {
    //done
    case "postgresjs":
      imports = `
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
`;
      connectionLogic = `
const connection = postgres(process.env.DATABASE_URL, { max: 1 });

const db = drizzle(connection);
`;
      break;
    //done
    case "node-postgres":
      imports = `
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
`;
      connectionLogic = `
const client = new Client({
  connectionString: process.env.DATABASE_URL!,
});

await client.connect();
const db = drizzle(client);
`;
      break;
    //done
    case "neon":
      imports = `
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { neon, neonConfig } from '@neondatabase/serverless';
`;
      connectionLogic = `
neonConfig.fetchConnectionCache = true;
 
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);
`;
      break;
    case "vercel-pg":
      imports = `
import { drizzle } from "drizzle-orm/vercel-postgres";
import { migrate } from "drizzle-orm/vercel-postgres/migrator";
import { sql } from '@vercel/postgres';
`;
      connectionLogic = `
  const db = drizzle(sql);
`;
      break;
    //done
    case "supabase":
      imports = `
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
`;
      connectionLogic = `
  const connection = postgres(process.env.DATABASE_URL, { max: 1 });

  const db = drizzle(connection);
`;
      break;
    // done
    case "aws":
      imports = `
import { drizzle } from 'drizzle-orm/aws-data-api/pg';
import { migrate } from "drizzle-orm/aws-data-api/pg/migrator";
import { RDSDataClient } from '@aws-sdk/client-rds-data';
import { fromIni } from '@aws-sdk/credential-providers';
`;
      connectionLogic = `
const rdsClient = new RDSDataClient({
  	credentials: fromIni({ profile: process.env['PROFILE'] }),
		region: 'us-east-1',
});
 
const db = drizzle(rdsClient, {
  database: process.env['DATABASE']!,
  secretArn: process.env['SECRET_ARN']!,
  resourceArn: process.env['RESOURCE_ARN']!,
});
`;
      break;
    // done
    case "planetscale":
      imports = `
import { drizzle } from "drizzle-orm/planetscale-serverless";
import { migrate } from "drizzle-orm/planetscale-serverless/migrator";
import { connect } from "@planetscale/database";
`;
      connectionLogic = `
const connection = connect({ url: process.env.DATABASE_URL! });
 
const db = drizzle(connection);
`;
      break;
    case "mysql-2":
      imports = `
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
`;
      connectionLogic = `
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);

  const db = drizzle(connection);
`;
      break;
    case "better-sqlite3":
      imports = `
import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from 'better-sqlite3';
`;
      connectionLogic = `
const sqlite = new Database('sqlite.db');
const db: BetterSQLite3Database = drizzle(sqlite);
`;
      break;
    default:
      break;
  }
  const template = `import "dotenv/config";
  ${imports}

const runMigrate = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  ${connectionLogic}

  console.log("⏳ Running migrations...");

  const start = Date.now();

  await migrate(db, { migrationsFolder: '${libPath}/db/migrations' });

  const end = Date.now();

  console.log("✅ Migrations completed in", end - start, "ms");

  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});`;

  createFile(`${libPath}/db/migrate.ts`, template);
};

export const createInitSchema = (libPath?: string, dbType?: DBType) => {
  const { packages, hasSrc, driver } = readConfigFile();
  const path = libPath
    ? `./${libPath}/db/schema/computers.ts`
    : `${hasSrc ? "src/" : ""}lib/db/schema/computers.ts`;
  const dbDriver = dbType ?? driver;
  let initModel = "";
  switch (dbDriver) {
    case "pg":
      initModel = `import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";${
        packages.includes("next-auth")
          ? '\nimport { users } from "./auth";'
          : ""
      }

export const computers = pgTable("computers", {
  id: serial("id").primaryKey(),
  brand: text("brand").notNull(),
  cores: integer("cores").notNull(),${
    packages.includes("next-auth")
      ? '\nuserId: integer("user_id").notNull().references(() => users.id)'
      : ""
  }
});`;
      break;

    case "mysql":
      initModel = `import { mysqlTable, serial, varchar, int } from "drizzle-orm/mysql-core";${
        packages.includes("next-auth")
          ? '\nimport { users } from "./auth";'
          : ""
      }

export const computers = mysqlTable("computers", {
  id: serial("id").primaryKey(),
  brand: varchar("brand", {length: 256}).notNull(),
  cores: int("cores").notNull(),${
    packages.includes("next-auth")
      ? '\nuserId: integer("user_id").notNull().references(() => users.id)'
      : ""
  }
});`;
      break;
    case "sqlite":
      initModel = `import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";${
        packages.includes("next-auth")
          ? '\nimport { users } from "./auth";'
          : ""
      }

export const computers = sqliteTable("computers", {
  id: integer("id").primaryKey(),
  brand: text("brand").notNull(),
  cores: integer("cores").notNull(),${
    packages.includes("next-auth")
      ? '\nuserId: integer("user_id").notNull().references(() => users.id)'
      : ""
  }
});`;
      break;
    default:
      break;
  }
  const sharedImports = `import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';`;
  const sharedSchemas = `// Schema for CRUD - used to validate API requests
export const insertComputerSchema = createInsertSchema(computers);
export const selectComputerSchema = createSelectSchema(computers);
export const computerIdSchema = selectComputerSchema.pick({ id: true });
export const updateComputerSchema = selectComputerSchema;

export type Computer = z.infer<typeof selectComputerSchema>;
export type NewComputer = z.infer<typeof insertComputerSchema>;
export type ComputerId = z.infer<typeof computerIdSchema>["id"];`;

  const finalDoc = `${sharedImports}\n${initModel}\n${sharedSchemas}`;
  createFile(path, finalDoc);
};

export const addScriptsToPackageJson = (
  libPath: string,
  driver: DBType,
  preferredPackageManager: PMType
) => {
  // Define the path to package.json
  const packageJsonPath = path.resolve("package.json");

  // Read package.json
  const packageJsonData = fs.readFileSync(packageJsonPath, "utf-8");

  // Parse package.json content
  let packageJson = JSON.parse(packageJsonData);

  const newItems = {
    "db:generate": `drizzle-kit generate:${driver}`,
    "db:migrate": `${
      preferredPackageManager === "bun" ? "bun run" : "tsx"
    } ${libPath}/db/migrate.ts`,
    "db:drop": `drizzle-kit drop`,
    "db:pull": `drizzle-kit introspect:${driver}`,
    ...(driver !== "pg" ? { "db:push": `drizzle-kit push:${driver}` } : {}),
    "db:studio": "drizzle-kit studio",
    "db:check": `drizzle-kit check:${driver}`,
  };
  packageJson.scripts = {
    ...packageJson.scripts,
    ...newItems,
  };

  // Stringify the updated content
  const updatedPackageJsonData = JSON.stringify(packageJson, null, 2);

  // Write the updated content back to package.json
  fs.writeFileSync(packageJsonPath, updatedPackageJsonData);

  consola.success("Scripts added to package.json");
};

export const installDependencies = async (
  dbType: DBProvider,
  preferredPackageManager: PMType
) => {
  const packages: { [key in DBProvider]: { regular: string; dev: string } } = {
    postgresjs: { regular: "postgres", dev: "pg" },
    "node-postgres": { regular: "pg", dev: "@types/pg" },
    neon: { regular: "@neondatabase/serverless", dev: "pg" },
    "vercel-pg": { regular: "@vercel/postgres", dev: "pg" },
    supabase: { regular: "postgres", dev: "pg" },
    aws: { regular: "", dev: "" }, // disabled
    planetscale: { regular: "@planetscale/database", dev: "mysql2" },
    "mysql-2": { regular: "mysql2", dev: "" },
    "better-sqlite3": {
      regular: "better-sqlite3",
      dev: "@types/better-sqlite3",
    },
    // "bun-sqlite": { regular: "drizzle-orm", dev: "drizzle-kit" },
  };
  // note this change hasnt been tested yet
  const dbSpecificPackage = packages[dbType];
  if (dbSpecificPackage) {
    await installPackages(
      {
        regular: `drizzle-orm drizzle-zod zod ${dbSpecificPackage.regular}`,
        dev: `drizzle-kit tsx dotenv ${dbSpecificPackage.dev}`,
      },
      preferredPackageManager
    );
  }
};

export const createDotEnv = (
  databaseUrl?: string,
  usingPlanetscale: boolean = false
) => {
  const dburl =
    databaseUrl ?? "postgresql://postgres:postgres@localhost:5432/{DB_NAME}";

  createFile(
    ".env",
    `${
      usingPlanetscale
        ? `# When using the PlanetScale driver, your connection string must end with ?ssl={"rejectUnauthorized":true} instead of ?sslaccept=strict.\n`
        : ""
    }DATABASE_URL=${dburl}`
  );
};

export const addToDotEnv = (items: { key: string; value: string }[]) => {
  const envPath = path.resolve(".env");
  const envExists = fs.existsSync(envPath);
  const newData = items.map((item) => `${item.key}=${item.value}`).join("\n");
  if (envExists) {
    const envData = fs.readFileSync(envPath, "utf-8");
    const updatedEnvData = `${envData}\n${newData}`;
    fs.writeFileSync(envPath, updatedEnvData);
  } else {
    fs.writeFileSync(envPath, newData);
  }
};
export function updateTsConfigTarget() {
  // Define the path to the tsconfig.json file
  const tsConfigPath = path.join(process.cwd(), "tsconfig.json");

  // Read the file
  fs.readFile(tsConfigPath, "utf8", (err, data) => {
    if (err) {
      console.error(
        `An error occurred while reading the tsconfig.json file: ${err}`
      );
      return;
    }

    // Parse the content as JSON
    const tsConfig = JSON.parse(data);

    // Modify the target property
    tsConfig.compilerOptions.target = "esnext";

    // Convert the modified object back to a JSON string
    const updatedContent = JSON.stringify(tsConfig, null, 2); // 2 spaces indentation

    // Write the updated content back to the file
    fs.writeFile(tsConfigPath, updatedContent, "utf8", (writeErr) => {
      if (writeErr) {
        consola.error(
          `An error occurred while writing the updated tsconfig.json file: ${writeErr}`
        );
        return;
      }

      consola.success(
        "Updated tsconfig.json target to esnext to support Drizzle-Kit."
      );
    });
  });
}

export function createQueriesAndMutationsFolders(
  libPath: string,
  driver: DBType
) {
  // create computers queries
  const query = `import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { computerIdSchema, computers, ComputerId } from "@/lib/db/schema/computers";

export const getComputers = async () => {
  const c = await db.select().from(computers);
  return { computers: c };
};

export const getComputerById = async (id: ComputerId) => {
  const { id: computerId } = computerIdSchema.parse({ id });
  const [c] = await db.select().from(computers).where(eq(computers.id, computerId));

  return { computer: c };
};`;

  const mutation = `import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NewComputer, insertComputerSchema, computers, computerIdSchema, ComputerId } from "@/lib/db/schema/computers";

export const createComputer = async (computer: NewComputer) => {
  const newComputer = insertComputerSchema.parse(computer);
  try {
    ${
      driver === "mysql" ? "" : "const [c] = "
    } await db.insert(computers).values(newComputer)${
    driver === "mysql"
      ? "\n    return { success: true }"
      : ".returning();\n    return { computer: c }"
  }
  } catch (err) {
    const message = (err as Error).message ?? "Error, please try again";
    console.error(message);
    return { error: message };
  }
};

export const updateComputer = async (id: ComputerId, computer: NewComputer) => {
  const { id: computerId } = computerIdSchema.parse({ id });
  const newComputer = insertComputerSchema.parse(computer);
  try {
    ${driver === "mysql" ? "" : "const [c] = "}await db
     .update(computers)
     .set(newComputer)
     .where(eq(computers.id, computerId!))${
       driver === "mysql"
         ? "\n    return { success: true };"
         : ".returning();\n    return { computer: c };"
     }
  } catch (err) {
    const message = (err as Error).message ?? "Error, please try again"
    console.error(message);
    return { error: message };
  }
};

export const deleteComputer = async (id: ComputerId) => {
  const { id: computerId } = computerIdSchema.parse({ id });
  try {
    ${
      driver === "mysql" ? "" : "const [c] = "
    }await db.delete(computers).where(eq(computers.id, computerId!))${
    driver === "mysql"
      ? "\n    return { success: true };"
      : ".returning();\n    return { computer: c };"
  }
  } catch (err) {
    const message = (err as Error).message ?? "Error, please try again"
    console.error(message);
    return { error: message };
  }
};`;
  createFile(`${libPath}/api/computers/queries.ts`, query);
  createFile(`${libPath}/api/computers/mutations.ts`, mutation);
}

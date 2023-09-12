import { confirm, select } from "@inquirer/prompts";
import { DBProvider, DBType } from "../../../../types.js";
import {
  addPackageToConfig,
  createFolder,
  readConfigFile,
  updateConfigFile,
  wrapInParenthesis,
} from "../../../../utils.js";
import {
  addScriptsToPackageJson,
  createDotEnv,
  createDrizzleConfig,
  createIndexTs,
  createInitSchema,
  createMigrateTs,
  createQueriesAndMutationsFolders,
  installDependencies,
  updateTsConfigTarget,
} from "./generators.js";
import { DBProviders } from "../../../init/utils.js";

export const addDrizzle = async () => {
  const { preferredPackageManager, hasSrc } = readConfigFile();

  let libPath = "";
  hasSrc ? (libPath = "src/lib") : (libPath = "lib");

  const dbType = (await select({
    message: "Please choose your DB type",
    choices: [
      { name: "Postgres", value: "pg" },
      // new Separator(),
      {
        name: "MySQL",
        value: "mysql",
        // disabled: wrapInParenthesis("MySQL is not yet supported"),
      },
      {
        name: "SQLite",
        value: "sqlite",
        disabled:
          preferredPackageManager === "bun"
            ? wrapInParenthesis(
                "Drizzle Kit doesn't support SQLite with Bun yet"
              )
            : false,
      },
    ],
  })) as DBType;

  // const dbProviders = DBProviders[dbType].filter((p) => {
  //   if (preferredPackageManager === "bun") return p.value !== "better-sqlite3";
  //   else return p.value !== "bun-sqlite";
  // });

  const dbProvider = (await select({
    message: "Please choose your DB Provider",
    choices: DBProviders[dbType],
    // choices: dbProviders,
  })) as DBProvider;

  let databaseUrl = "";

  if (dbType === "sqlite") {
    databaseUrl = "sqlite.db";
  } else if (dbType === "mysql") {
    databaseUrl = "mysql://root:root@localhost:3306/{DB_NAME}";
  } else {
    databaseUrl = "postgres://postgres:postgres@localhost:5432/{DB_NAME}";
  }

  if (dbProvider === "neon")
    databaseUrl = databaseUrl.concat("?sslmode=require");

  const includeExampleModel = await confirm({
    message:
      "Would you like to include an example model? (suggested for new users)",
    default: true,
  });

  // create all the files here

  if (includeExampleModel) {
    createInitSchema(libPath, dbType);
    createQueriesAndMutationsFolders(libPath, dbType);
  } else {
    createFolder(`${hasSrc ? "src/" : ""}lib/db/schema`);
    createFolder(`${hasSrc ? "src/" : ""}lib/api`);
  }

  // dependent on dbtype and driver, create
  createIndexTs(libPath, dbType, dbProvider);
  createMigrateTs(libPath, dbType, dbProvider);
  createDrizzleConfig(libPath, dbProvider);

  // perhaps using push rather than migrate for sqlite?
  addScriptsToPackageJson(libPath, dbType, preferredPackageManager);
  createDotEnv(databaseUrl, dbProvider === "planetscale");
  updateTsConfigTarget();

  updateConfigFile({ driver: dbType, provider: dbProvider, orm: "drizzle" });
  await installDependencies(dbProvider, preferredPackageManager);
  addPackageToConfig("drizzle");
};

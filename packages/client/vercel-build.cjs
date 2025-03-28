/**
 * Vercel Build Helper Script
 *
 * This script helps with creating proper module resolution for @tetris/types
 * in the Vercel build environment.
 */

const fs = require("fs");
const path = require("path");

// Only run this in Vercel environment
if (!process.env.VERCEL) {
  console.log("Not in Vercel environment, skipping helper");
  process.exit(0);
}

console.log("Vercel build helper running...");

// Log the current directory structure
console.log("Current directory:", process.cwd());
console.log("Files in current directory:", fs.readdirSync("."));

// Create node_modules/@tetris directory if it doesn't exist
const tetrisModuleDir = path.join(process.cwd(), "node_modules", "@tetris");
if (!fs.existsSync(tetrisModuleDir)) {
  console.log(`Creating directory: ${tetrisModuleDir}`);
  fs.mkdirSync(tetrisModuleDir, { recursive: true });
}

// Determine the proper path to the types package
let typesPackageDir = "";
const possiblePaths = [
  // Direct path in workspace
  path.join(process.cwd(), "..", "types"),
  // Nested path in Vercel
  path.join(process.cwd(), "..", "..", "packages", "types"),
];

// Check each possible path
for (const dir of possiblePaths) {
  console.log(`Checking for types package at: ${dir}`);
  if (fs.existsSync(dir)) {
    typesPackageDir = dir;
    console.log(`Types package found at: ${dir}`);
    break;
  }
}

if (!typesPackageDir) {
  console.error("Types package not found in any expected location!");
  process.exit(1);
}

// Create a symlink from node_modules/@tetris/types to the types package
const targetDir = path.join(tetrisModuleDir, "types");
if (!fs.existsSync(targetDir)) {
  console.log(`Creating symlink: ${targetDir} -> ${typesPackageDir}`);
  try {
    fs.symlinkSync(typesPackageDir, targetDir, "dir");
    console.log("Symlink created successfully");
  } catch (error) {
    console.error("Error creating symlink:", error);

    // If symlink fails, try to copy the directory instead
    console.log("Falling back to copying directory...");
    copyDirectory(typesPackageDir, targetDir);
  }
} else {
  console.log(`Target directory already exists: ${targetDir}`);
}

// Now make sure the dist directory exists
const typesDistDir = path.join(typesPackageDir, "dist");
if (!fs.existsSync(typesDistDir)) {
  console.log(
    `Types dist directory not found at ${typesDistDir}, running build...`
  );

  // Run the build script for types if it wasn't built yet
  const { execSync } = require("child_process");
  try {
    console.log(`Changing to directory: ${typesPackageDir}`);
    process.chdir(typesPackageDir);
    console.log("Running npm build for types...");
    execSync("npm run build", { stdio: "inherit" });
    console.log("Types build completed successfully");
  } catch (error) {
    console.error("Error building types:", error);
    process.exit(1);
  }
}

// Utility function to recursively copy a directory
function copyDirectory(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  const files = fs.readdirSync(source);
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);

    const stats = fs.statSync(sourcePath);
    if (stats.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }

  console.log(`Copied directory from ${source} to ${target}`);
}

console.log("Vercel build helper completed");

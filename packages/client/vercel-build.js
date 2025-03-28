/**
 * Vercel Build Helper Script
 *
 * This script helps with creating proper module resolution for @tetris/types
 * in the Vercel build environment.
 */

const fs = require("fs");
const path = require("path");

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

// Check if types package exists in expected location
const typesPackageDir = path.join(
  process.cwd(),
  "..",
  "..",
  "packages",
  "types"
);
console.log(`Checking for types package at: ${typesPackageDir}`);
if (fs.existsSync(typesPackageDir)) {
  console.log("Types package found");

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
} else {
  console.error("Types package not found!");
  process.exit(1);
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

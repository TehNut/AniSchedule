#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

function deleteFolderRecursive(dir) {
  if (fs.existsSync(dir) && fs.lstatSync(dir).isDirectory()) {
    fs.readdirSync(dir).forEach(file => {
      const curPath = path.join(dir, file);

      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });

    console.log(`Deleting directory "${dir}"...`);
    fs.rmdirSync(dir);
  }
}

deleteFolderRecursive(path.join(__dirname, '../dist'));
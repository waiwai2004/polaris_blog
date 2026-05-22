const fs = require("fs");
const path = require("path");

const src = ".";
const dest = "build";
const skip = ["node_modules", "build", ".git"];

function copy(s, d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  for (const f of fs.readdirSync(s)) {
    if (skip.includes(f)) continue;
    const sp = path.join(s, f);
    const dp = path.join(d, f);
    if (fs.statSync(sp).isDirectory()) {
      copy(sp, dp);
    } else {
      fs.copyFileSync(sp, dp);
    }
  }
}

copy(src, dest);
console.log("Build complete: files copied to ./build");

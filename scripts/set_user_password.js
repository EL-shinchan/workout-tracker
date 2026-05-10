#!/usr/bin/env node
const { setUserPassword } = require("../server/services/authStore");

const [name] = process.argv.slice(2);
let password = "";

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  password += chunk;
});

process.stdin.on("end", () => {
  try {
    if (!name) {
      throw new Error("Usage: printf '<password>' | node scripts/set_user_password.js <name>");
    }

    const cleanPassword = password.replace(/\n$/, "");
    if (!cleanPassword) {
      throw new Error("Password cannot be empty.");
    }

    const user = setUserPassword(name, cleanPassword);
    console.log(JSON.stringify({ ok: true, user: { id: user.id, name: user.name } }));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exit(1);
  }
});

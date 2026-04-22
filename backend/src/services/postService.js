const db = require("./dbService");

const TABLE = "posts";

async function createPost(payload) {
  return db.insert(TABLE, payload);
}

module.exports = { createPost };

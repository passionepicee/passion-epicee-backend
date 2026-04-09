const fs = require("fs");
  let content = fs.readFileSync("server.js", "utf8");
  content = content.replace(/\u201C/g, '"');
  content = content.replace(/\u201D/g, '"');
  content = content.replace(/\u2018/g, "'");
  content = content.replace(/\u2019/g, "'");
  fs.writeFileSync("server.js", content, "utf8");
  console.log("OK - guillemets corriges");
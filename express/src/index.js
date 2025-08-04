const express = require("express");
const app = express();
const port = 3002;

app.post("/create-bookmark", (req, res) => {
  res.send("Hello World!");
});

app.get("/export", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

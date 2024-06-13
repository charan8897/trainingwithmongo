import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const router = Router();

router.get("/", (req, res) => {
  res.send("api are up");
});

fs.readdirSync(__dirname)
  .filter((file) => file !== "index.js")
  .forEach((version) => {
    import(path.join(__dirname, version, "/index.js"))
      .then((module) => {
        router.use(`/${version}`, module.default);
      })
      .catch((err) => {
        console.error(err);
      });
  });

export default router;

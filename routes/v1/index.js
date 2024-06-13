import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const router = Router();

router.get("/", (req, res) => {
  res.send("v1 api are up");
});

fs.readdirSync(__dirname)
  .filter((file) => file !== "index.js")
  .forEach((file) => {
    const routeName = file.split(".")[0];
    console.log(routeName);
    import(path.join(__dirname, file))
      .then((module) => {
        router.use(`/${routeName}`, module.default);
      })
      .catch((err) => {
        console.error(err);
      });
  });

export default router;

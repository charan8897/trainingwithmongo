import { Router } from "express"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import assetControllers from "../../controllers/assetcontrollers.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const router = Router()
router.get("/v1", (req, res) => {
  res.send("v1 api are up")
})
fs.readdirSync(__dirname)
  .filter((file) => file !== "index.js" && !file.startsWith("."))
  .forEach((file) => {
    const routeName = file.split(".")[0]
    // import(path.join(__dirname, file));
    import(`./${file}`)
      .then((module) => {
        console.log(routeName)
        router.use(`/${routeName}`, module.default)
      })
      .catch((err) => {
        console.error(err)
      })
  })

export default router

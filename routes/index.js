import { Router } from "express"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const router = Router()
router.get("/health", (req, res) => {
  res.send("api are up")
})
fs.readdirSync(__dirname)
  .filter((file) => {
    // filter out non-directories and the current file
    const isDirectory = fs.statSync(path.join(__dirname, file)).isDirectory()
    return file !== "index.js" && isDirectory
  })
  .forEach((version) => {
    import(`./${version}/index.js`)
      .then((module) => {
        console.log(version)
        router.use(`/${version}`, module.default)
      })
      .catch((err) => {
        console.error(err)
      })
  })
export default router

import express from "express"
import morgan from "morgan"
import routes from "./routes/index.js"
import router from "./routes/v1/routesforasset.js"

const app = express()

const PORT = process.env.PORT || 3000

app.use(morgan("combined"))

app.use(express.json())

app.get("/", (req, res) => res.send("Welcome to our API"))
app.use("/api", routes)

app.use("/api/v1/assets", router)
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})

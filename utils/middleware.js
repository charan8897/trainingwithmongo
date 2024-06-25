import jwt from "jsonwebtoken"
import { connectToDatabase as getDB } from "../utils/db.js"

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization

  if (authHeader) {
    const token = authHeader.split(" ")[1]

    jwt.verify(token, "your_secret_key", (err, user) => {
      if (err) {
        return res.sendStatus(403)
      }
      req.user = user
      next()
    })
  } else {
    res.sendStatus(401)
  }
}

export const validateCreatePayload = (req, res, next) => {
  if (!req.body.name || !req.body.value) {
    res.status(500).send({ message: "Invalid payload" })
  } else {
    next()
  }
}

export const responseProcessing = (req, res, next) => {
  res.processResponse = (status, message, data) => {
    if (status < 400) {
      res.status(status).send({
        success: true,
        status,
        message,
        data,
      })
    } else {
      res.status(status).send({
        success: false,
        status,
        message,
        data,
      })
    }
  }
  next()
}

import { connectToDatabase as getDB } from "../utils/db.js"
// controller.js
import {
  authenticateJWT,
  validateCreatePayload,
  responseProcessing,
} from "../utils/middleware.js"

// gatewayController.js
const addsensor = [
  authenticateJWT,
  validateCreatePayload,
  responseProcessing,
  async (req, res) => {
    const db = getDB()
    try {
      const result = await db.collection("sensors_meta").insertOne(req.body)
      res.status(201).send({
        message: "Sensor created successfully",
        sensorId: result.insertedId,
      })
    } catch (error) {
      res.status(500).send({ message: "Error creating sensor", error: error })
    }
  },
]

// Update an existing Sensor
const updateSensor = async (req, res) => {
  const db = getDB()
  try {
    const result = await db
      .collection("sensors_meta")
      .updateOne({ sensor_id: req.params.sensor_id }, { $set: req.body })

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Sensor not found" })
    } else {
      res.status(200).send({ message: "Sensor updated successfully" })
    }
  } catch (error) {
    res.status(500).send({ message: "Error updating sensor", error: error })
  }
}

// Delete a Sensor
const deleteSensor = async (req, res) => {
  const db = getDB()
  try {
    const result = await db
      .collection("sensors_meta")
      .deleteOne({ sensor_id: req.params.sensor_id })

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .send({ message: "Sensor not found or already deleted" })
    } else {
      res.status(200).send({ message: "Sensor deleted successfully" })
    }
  } catch (error) {
    res.status(500).send({ message: "Error deleting sensor", error: error })
  }
}

// Export the functions
export default {
  addsensor,
  updateSensor,
  deleteSensor,
}

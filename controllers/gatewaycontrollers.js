import { connectToDatabase as getDB } from "../utils/db.js"
// controller.js
import {
  authenticateJWT,
  validateCreatePayload,
  responseProcessing,
} from "../utils/middleware.js"

// gatewayController.js
const addGateway = [
  authenticateJWT,
  validateCreatePayload,
  responseProcessing,
  async (req, res) => {
    const db = getDB()
    try {
      const result = await db.collection("gateways_meta").insertOne(req.body)
      res.processResponse(201, "Gateway created successfully", {
        gatewayId: result.insertedId,
      })
    } catch (error) {
      res.processResponse(500, "Error creating gateway", { error: error })
    }
  },
]

// Update an existing gateway
const updateGateway = async (req, res) => {
  const db = getDB()
  try {
    const result = await db
      .collection("assets_meta")
      .updateOne({ gateway_id: req.params.gateway_id }, { $set: req.body })

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Gateway not found" })
    } else {
      res.status(200).send({ message: "Gateway updated successfully" })
    }
  } catch (error) {
    res.status(500).send({ message: "Error updating gateway", error: error })
  }
}

// Delete a gateway
const deleteGateway = async (req, res) => {
  const db = getDB()
  try {
    const result = await db
      .collection("assets_meta")
      .deleteOne({ gateway_id: req.params.gateway_id })

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .send({ message: "Gateway not found or already deleted" })
    } else {
      res.status(200).send({ message: "Gateway deleted successfully" })
    }
  } catch (error) {
    res.status(500).send({ message: "Error deleting gateway", error: error })
  }
}

// Export the functions
export default { addGateway, updateGateway, deleteGateway }

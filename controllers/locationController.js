import { connectToDatabase as getDB } from "../utils/db.js"
// controller.js
import {
  authenticateJWT,
  validateCreatePayload,
  responseProcessing,
} from "../utils/middleware.js"

const addLocation = [
  authenticateJWT,
  validateCreatePayload,
  responseProcessing,
  async (req, res) => {
    const db = getDB()
    try {
      const result = await db.collection("locations_meta").insertOne(req.body)
      res.status(201).send({
        message: "Location created successfully",
        locationId: result.insertedId,
      })
    } catch (error) {
      res.status(500).send({ message: "Error creating location", error: error })
    }
  },
]

const updateLocation = async (req, res) => {
  const db = getDB()
  try {
    const result = await db
      .collection("locations_meta")
      .updateOne({ location_id: req.params.location_id }, { $set: req.body })
    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Location not found" })
    } else {
      res.status(200).send({ message: "Location updated successfully" })
    }
  } catch (error) {
    res.status(500).send({ message: "Error updating location", error: error })
  }
}

const deleteLocation = async (req, res) => {
  const db = getDB()
  try {
    const result = await db
      .collection("locations_meta")
      .deleteOne({ location_id: req.params.location_id })
    if (result.deletedCount === 0) {
      return res
        .status(404)
        .send({ message: "Location not found or already deleted" })
    } else {
      res.status(200).send({ message: "Location deleted successfully" })
    }
  } catch (error) {
    res.status(500).send({ message: "Error deleting location", error: error })
  }
}

// Create a Package
const addPackage = async (req, res) => {
  const db = getDB()
  try {
    const result = await db.collection("packages_meta").insertOne(req.body)
    res.status(201).send({
      message: "Package created successfully",
      packageId: result.insertedId,
    })
  } catch (error) {
    res.status(500).send({ message: "Error creating package", error: error })
  }
}

// Update an existing Package
const updatePackage = async (req, res) => {
  const db = getDB()
  try {
    const result = await db
      .collection("packages_meta")
      .updateOne({ package_id: req.params.package_id }, { $set: req.body })

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Package not found" })
    } else {
      res.status(200).send({ message: "Package updated successfully" })
    }
  } catch (error) {
    res.status(500).send({ message: "Error updating package", error: error })
  }
}

// Delete a Package
const deletePackage = async (req, res) => {
  const db = getDB()
  try {
    const result = await db
      .collection("packages_meta")
      .deleteOne({ package_id: req.params.package_id })

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .send({ message: "Package not found or already deleted" })
    } else {
      res.status(200).send({ message: "Package deleted successfully" })
    }
  } catch (error) {
    res.status(500).send({ message: "Error deleting package", error: error })
  }
}

export default {
  addLocation,
  updateLocation,
  deleteLocation,
  addPackage,
  updatePackage,
  deletePackage,
}

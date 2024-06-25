// AssetsController.js
import { connectToDatabase as getDB } from "../utils/db.js"
import {
  authenticateJWT,
  validateCreatePayload,
  responseProcessing,
} from "../utils/middleware.js"

const trackAsset = [
  authenticateJWT,
  async (req, res) => {
    const db = getDB()
    try {
      // Logic for tracking asset
      // Assuming assets are tracked with the 'asset_id'
      const asset = await db
        .collection("assets")
        .findOne({ _id: req.params.asset_id })
      if (!asset) return res.status(404).send({ message: "Asset not found" })
      res.status(200).send(asset)
    } catch (error) {
      res.status(500).send({ message: "Error finding asset", error: error })
    }
  },
]
const generateTripReport = [
  authenticateJWT,
  async (req, res) => {
    const db = getDB()
    try {
      const trip = await db
        .collection("trips")
        .findOne({ _id: req.body.trip_id })
      if (!trip) return res.status(404).send({ message: "Trip not found" })
      res.status(200).send(trip)
    } catch (error) {
      res
        .status(500)
        .send({ message: "Error generating trip report", error: error })
    }
  },
]

const generateTripCSV = [
  authenticateJWT,
  async (req, res) => {
    const db = getDB()
    try {
      // Find all trips in the collection
      let trips = await db.collection("trips").find({}).toArray()

      // Use assumed external CSV library to convert trips to CSV
      const csv = convertToCSV(trips)

      res.setHeader("Content-Type", "text/csv")
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="' + 'trips.csv"'
      )
      res.status(200).send(csv)
    } catch (error) {
      res
        .status(500)
        .send({ message: "Error generating trip CSV", error: error })
    }
  },
]
const getAssets = [
  authenticateJWT,
  async (req, res) => {
    const db = getDB()
    try {
      // Logic for getting all assets
      // Assuming assets are in 'assets' collection
      const assets = await db.collection("assets").find({}).toArray()

      if (!assets) return res.status(404).send({ message: "No assets found" })

      res.status(200).send(assets)
    } catch (error) {
      res.status(500).send({ message: "Error fetching assets", error: error })
    }
  },
]

const addAsset = [
  authenticateJWT,
  validateCreatePayload,
  responseProcessing,
  async (req, res) => {
    const db = getDB()
    try {
      const result = await db.collection("assets_meta").insertOne(req.body)
      res.status(201).send({
        message: "Asset created successfully",
        assetId: result.insertedId,
      })
    } catch (error) {
      res.status(500).send({ message: "Error creating asset", error: error })
    }
  },
]

const updateAsset = [
  authenticateJWT,
  async (req, res) => {
    const db = getDB()
    try {
      const result = await db
        .collection("assets_meta")
        .updateOne({ asset_id: req.params.asset_id }, { $set: req.body })
      if (result.matchedCount === 0) {
        return res.status(404).send({ message: "Asset not found" })
      } else {
        res.status(200).send({ message: "Asset updated successfully" })
      }
    } catch (error) {
      res.status(500).send({ message: "Error updating asset", error: error })
    }
  },
]

const deleteAsset = [
  authenticateJWT,
  async (req, res) => {
    const db = getDB()
    try {
      const result = await db
        .collection("assets_meta")
        .deleteOne({ asset_id: req.params.asset_id })
      if (result.deletedCount === 0) {
        return res
          .status(404)
          .send({ message: "Asset not found or already deleted" })
      } else {
        res.status(200).send({ message: "Asset deleted successfully" })
      }
    } catch (error) {
      res.status(500).send({ message: "Error deleting asset", error: error })
    }
  },
]

export default {
  addAsset,
  updateAsset,
  deleteAsset,
  trackAsset,
  generateTripReport,
  generateTripCSV,
  getAssets,
}

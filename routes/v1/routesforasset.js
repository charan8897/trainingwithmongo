import express from "express"
import assetcontrollers from "../../controllers/assetcontrollers.js"
import gatewaycontrollers from "../../controllers/gatewaycontrollers.js"
import locationController from "../../controllers/locationController.js"
import sensorController from "../../controllers/sensorController.js"
// import gatewaycontrollers from "../../controllers/gatewaycontrollers.js"
// import locationController from "../../controllers/locationController.js"
// import sensorController from "../../controllers/sensorController.js"
const router = express.Router()
// import assetController from "../controllers/assetController"
// import locationController from "../../controllers/locationController"
// import gatewaycontrollers from "../../controllers/gatewaycontrollers"
// import sensorController from "../../controllers/sensorController"

// Asset endpoints
router.get("/track/:asset_id", assetcontrollers.trackAsset)
router.post("/trip", assetcontrollers.generateTripReport)
router.post("/trip/csv", assetcontrollers.generateTripCSV)
router.get("/", assetcontrollers.getAssets)
router.post("/", assetcontrollers.addAsset)
router.put("/:asset_id", assetcontrollers.updateAsset)
router.delete("/:asset_id", assetcontrollers.deleteAsset)

// Gateway endpoints
router.post("/gateway", gatewaycontrollers.addGateway)
router.put("/gateway/:gateway_id", gatewaycontrollers.updateGateway)
router.delete("/gateway/:gateway_id", gatewaycontrollers.deleteGateway)

// Location endpoints
router.post("/location", locationController.addLocation)
router.put("/location/:location_id", locationController.updateLocation)
router.delete("/location/:location_id", locationController.deleteLocation)

//Sensor endpoints
router.post("/sensor", sensorController.addsensor)
router.put("/sensor/:sensor_id", sensorController.updateSensor)
router.delete("/sensor/:sensor_id", sensorController.deleteSensor)

export default router

import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.send("user type page");
});

export default router;

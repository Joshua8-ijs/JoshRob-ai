import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { python } from "../services/pythonClient.js";

const router = Router();

router.use(requireAuth);

router.post("/trips", async (req, res, next) => {
  try {
    const trip = { ...(req.body || {}), user_id: req.user.sub };
    res.status(201).json(await python.telemetry.saveTrip(trip));
  } catch (err) {
    next(err);
  }
});

router.get("/trips", async (req, res, next) => {
  try {
    res.json(await python.telemetry.trips(req.user.sub));
  } catch (err) {
    next(err);
  }
});

router.get("/stats", async (_req, res, next) => {
  try {
    res.json(await python.telemetry.stats());
  } catch (err) {
    next(err);
  }
});

export default router;

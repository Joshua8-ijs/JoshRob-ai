import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { python } from "../services/pythonClient.js";

const router = Router();

router.use(requireAuth);

router.get("/geocode", async (req, res, next) => {
  try {
    res.json(await python.gis.geocode(req.query.q || ""));
  } catch (err) {
    next(err);
  }
});

router.get("/reverse", async (req, res, next) => {
  try {
    res.json(await python.gis.reverse(req.query.lat, req.query.lng));
  } catch (err) {
    next(err);
  }
});

router.get("/route", async (req, res, next) => {
  try {
    res.json(await python.gis.route(req.query));
  } catch (err) {
    next(err);
  }
});

router.get("/nearby", async (req, res, next) => {
  try {
    res.json(await python.gis.nearby(req.query));
  } catch (err) {
    next(err);
  }
});

router.get("/types", async (_req, res, next) => {
  try {
    res.json(await python.gis.types());
  } catch (err) {
    next(err);
  }
});

export default router;

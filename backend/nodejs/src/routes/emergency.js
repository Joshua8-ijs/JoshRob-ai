import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { python } from "../services/pythonClient.js";

const router = Router();

router.use(requireAuth);

router.post("/sos", async (req, res, next) => {
  try {
    const body = { ...(req.body || {}), user_id: req.user.sub, user_name: req.user.name };
    res.status(201).json(await python.emergency.sos(body));
  } catch (err) {
    next(err);
  }
});

router.get("/alerts", async (req, res, next) => {
  try {
    res.json(await python.emergency.alerts(req.user.sub));
  } catch (err) {
    next(err);
  }
});

router.post("/alerts/respond", async (req, res, next) => {
  try {
    res.json(await python.emergency.respond(req.body));
  } catch (err) {
    next(err);
  }
});

export default router;

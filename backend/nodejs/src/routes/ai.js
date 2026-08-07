import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { python } from "../services/pythonClient.js";

const router = Router();

router.use(requireAuth);

router.post("/assist", async (req, res, next) => {
  try {
    const { message, context = {} } = req.body || {};
    const result = await python.ai.assist({
      message,
      context: { ...context, user_id: req.user.sub, user_name: req.user.name },
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/history", async (req, res, next) => {
  try {
    res.json(await python.ai.history(req.user.sub));
  } catch (err) {
    next(err);
  }
});

export default router;

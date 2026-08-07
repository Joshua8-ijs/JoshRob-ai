import { Router } from "express";
import { requireAuth, signToken } from "../middleware/auth.js";
import { python } from "../services/pythonClient.js";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const { user } = await python.auth.register(req.body);
    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { user } = await python.auth.login(req.body);
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const { user } = await python.auth.me(req.user.sub);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const { user } = await python.auth.updateMe(req.user.sub, req.body);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;

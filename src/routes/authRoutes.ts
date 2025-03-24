import express from "express";
import { initiateAuth, callback, refreshAuth } from "../controllers/authController";

const router = express.Router();

router.get("/oauth/initiate", initiateAuth);
router.get("/oauth/callback", callback);

export default router;

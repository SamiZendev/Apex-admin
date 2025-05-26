import express from "express";
import { initiateAuth, callback } from "../controllers/authController";
import {
  calendlyCallback,
  initiateCalendlyAuth,
} from "../controllers/calendly/authController";
import { onceHubAuth } from "../controllers/onceHub/authController";

const router = express.Router();

router.get("/oauth/initiate", initiateAuth);
router.get("/oauth/callback", callback);

router.get("/oauth/calendly/initiate", initiateCalendlyAuth);
router.get("/oauth/calendly/callback", calendlyCallback);

router.post("/oauth/oncehub/initiate", onceHubAuth);
export default router;

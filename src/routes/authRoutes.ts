import express from "express";
import {
  initiateAuth,
  callback,
  refreshAuth,
} from "../controllers/authController";
import {
  calendlyCallback,
  initiateCalendlyAuth,
} from "../controllers/calendly/authController";

const router = express.Router();

router.get("/oauth/initiate", initiateAuth);
router.get("/oauth/callback", callback);

router.get("/oauth/calendly/initiate", initiateCalendlyAuth);
router.get("/oauth/calendly/callback", calendlyCallback);

export default router;

import { getEventTypes } from "../controllers/calendly/controller";
import express from "express";

const router = express.Router();
router.get("/getCalendars", getEventTypes);

export default router;

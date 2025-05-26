import { getListOfAllCalendars } from "../controllers/onceHub/controller";
import express from "express";

const router = express.Router();
router.get("/getOncehubCalendars", getListOfAllCalendars);

export default router;

import express from "express";
import webhookRoutes from "./webhookRoutes";
import apiRoutes from "./apiRoutes";
import calendlyRoutes from "./calendlyRoutes";
import oncehubRoutes from "./oncehubRoutes";

const router = express.Router();

router.use("/", webhookRoutes);
router.use("/", apiRoutes);
router.use("/", calendlyRoutes);
router.use("/", oncehubRoutes);

export default router;

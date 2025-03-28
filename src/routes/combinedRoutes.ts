import express from "express";
import webhookRoutes from "./webhookRoutes";
import apiRoutes from "./apiRoutes";

const router = express.Router();

router.use("/", webhookRoutes); 
router.use("/", apiRoutes); 

export default router;

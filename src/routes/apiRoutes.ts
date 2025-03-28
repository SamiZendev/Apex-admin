import { configureSubaccount, getDataById } from "../controllers/apiController";
import express from "express";

const router = express.Router();

router.get('/getLocation',getDataById)
router.put('/configureAccount',configureSubaccount)

export default router;

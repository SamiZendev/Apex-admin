import { fetchAllCalendarsByLocationId } from "../controllers/ghlController";
import {
  configureSubaccount,
  getDataById,
  getListOfAllSubaccountByCompanyId,
} from "../controllers/apiController";
import express from "express";

const router = express.Router();

router.get("/getLocation", getDataById);
router.get(
  "/getListOfAllSubaccountByCompanyId",
  getListOfAllSubaccountByCompanyId
);
router.get("/fetchAllCalendarsByLocationId", fetchAllCalendarsByLocationId);
router.put("/configureAccount", configureSubaccount);
export default router;

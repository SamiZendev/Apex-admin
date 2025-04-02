import { fetchAllCalendarsByLocationId } from "../controllers/ghlController";
import {
  configureSubaccount,
  getDataById,
  getListOfAllSubaccountByCompanyId,
} from "../controllers/apiController";
import express from "express";
import { signInUsingPassword } from "../controllers/authController";

const router = express.Router();

router.get("/getLocation", getDataById);
router.get(
  "/getListOfAllSubaccountByCompanyId",
  getListOfAllSubaccountByCompanyId
);
router.get("/fetchAllCalendarsByLocationId", fetchAllCalendarsByLocationId);
router.put("/configureAccount", configureSubaccount);
router.post("/login" , signInUsingPassword);
export default router;

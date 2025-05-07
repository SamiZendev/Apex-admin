import { fetchAllCalendarsByLocationId } from "../controllers/ghlController";
import {
  bookAppointment,
  configureSubaccount,
  getCalendarAndSubaccountByBookingAppointmentDetails,
  getDataById,
  getListOfAllSubaccountByCompanyId,
  getTimezones,
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
router.post("/login", signInUsingPassword);
router.post("/fetchSlots", getCalendarAndSubaccountByBookingAppointmentDetails);
router.post("/booking", bookAppointment);
router.get("/timezone", getTimezones);

export default router;

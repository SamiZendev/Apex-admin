import { fetchAllCalendarsByLocationId } from "../controllers/ghlController";
import {
  bookAppointment,
  configureSubaccount,
  getCalendarAndSubaccountByBookingAppointmentDetails,
  getDataById,
  getListOfAllSubaccountByCompanyId,
  getStates,
  getTimezones,
} from "../controllers/apiController";
import express from "express";
import { signInUsingPassword } from "../controllers/authController";
import {
  createUTM,
  deleteUTM,
  getAllUTM,
  getUTMById,
  updateUTM,
} from "../controllers/utmController";

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
router.post("/utm", createUTM);
router.get("/fetchUTM", getAllUTM);
router.get("/getUTMById/:id", getUTMById);
router.put("/utm/:id", updateUTM);
router.delete("/utm/:id", deleteUTM);
router.get("/states", getStates);

export default router;

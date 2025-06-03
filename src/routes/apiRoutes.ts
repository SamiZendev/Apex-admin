import { fetchAllCalendarsByLocationId } from "../controllers/ghlController";
import {
  bookAppointment,
  configureSubaccount,
  deleteAccount,
  getCalendarAndSubaccountByBookingAppointmentDetails,
  getDataById,
  getListOfAllAccounts,
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
import {
  getStyleConfiguration,
  saveStyleConfiguration,
} from "../controllers/styleController";

const router = express.Router();

router.get("/getLocation", getDataById);
router.get("/getListOfAllAccounts", getListOfAllAccounts);
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
router.delete("/account/:id", deleteAccount);
router.get("/states", getStates);
router.post("/configurations", saveStyleConfiguration);
router.get("/getConfigurations", getStyleConfiguration);

export default router;

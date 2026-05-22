import express from "express";
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from "../controllers/addressController";

import { auth } from '../middleware/auth';

const router = express.Router();

// all routes protected
router.get("/", auth, getAddresses);
router.post("/", auth, createAddress);
router.put("/:id", auth, updateAddress);
router.delete("/:id", auth, deleteAddress);

export default router;
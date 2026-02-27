import express from "express";
import { createOrder,getMyOrders } from "../controllers/orderController";

import { auth } from '../middleware/auth';

const router = express.Router();

router.post("/", auth, createOrder);
router.get('/my', auth, getMyOrders);

export default router;

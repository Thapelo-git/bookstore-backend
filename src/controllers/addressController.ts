import { Request, Response } from "express";
import { Address } from "../models/address";

// GET all addresses for logged-in user
export const getAddresses = async (req: any, res: Response) => {
  try {
    const addresses = await Address.find({ userId: req.user.id });

    res.json({
      success: true,
      data: addresses,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// CREATE address
export const createAddress = async (req: any, res: Response) => {
  try {
    const address = await Address.create({
      ...req.body,
      userId: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: address,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE address
export const updateAddress = async (req: any, res: Response) => {
  try {
    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true }
    );

    res.json({
      success: true,
      data: address,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE address
export const deleteAddress = async (req: any, res: Response) => {
  try {
    await Address.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    res.json({
      success: true,
      message: "Address deleted",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
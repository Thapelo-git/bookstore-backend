import Order from "../models/order";
import { Request, Response } from 'express';
import Book from "../models/Book";
import { AuthRequest } from '../types/book';
export const createOrder = async (req: AuthRequest, res:Response) => {
  try {
    const { items, shippingAddress } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No order items" });
    }

    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const book = await Book.findById(item.book);

      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }

      total += book.price * item.quantity;

      orderItems.push({
        book: book._id,
        quantity: item.quantity,
        price: book.price, // store snapshot price
      });
    }

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      total,
      shippingAddress,
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  const orders = await Order.find({ user: req.user._id })
    .populate('items.book')
    .sort({ createdAt: -1 });

  res.json(orders);
};

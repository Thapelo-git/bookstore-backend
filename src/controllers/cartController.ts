import { Request, Response } from 'express';
import Cart from '../models/Cart';

export const getOrCreateCart = async (req: any, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: []
      });
    }

    cart = await Cart.findOne({ user: userId }).populate({
      path: "items.book",
      model: "Book"
    });

    res.json({
      success: true,
      items: cart?.items || []
    });

  } catch (error: any) {
    console.error("Cart Load Error:", error);

    res.status(500).json({
      message: error.message || "Cart load failed"
    });
  }
};

// POST /api/cart
export const addToCart = async (req: any, res: Response) => {
  try {
    console.log("Cart add request body:", req.body);
    console.log("User:", req.user);

    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { bookId, quantity } = req.body;

    if (!bookId) {
      return res.status(400).json({ message: "bookId is required" });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: []
      });
    }

    const existingItem = cart.items.find(
      (item: any) => item.book.toString() === bookId
    );

    if (existingItem) {
      existingItem.quantity += quantity || 1;
    } else {
      cart.items.push({
        book: bookId,
        quantity: quantity || 1
      });
    }

    await cart.save();

    const populatedCart = await Cart.findOne({ user: userId })
      .populate("items.book");

    res.json({
      success: true,
      items: populatedCart?.items || []
    });

  } catch (error: any) {
    console.error("Cart Controller Error:", error);

    res.status(500).json({
      message: error.message || "Cart operation failed"
    });
  }
};

// PUT /api/cart/:bookId
export const updateCartItem = async (req: any, res: Response) => {
  try {
    const userId = req.user._id;
    const { bookId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = cart.items.find(
      (item: any) => item.book.toString() === bookId
    );

    if (!item) return res.status(404).json({ message: 'Item not found' });

    item.quantity = quantity;

    await cart.save();

    res.status(200).json({ success: true, items: cart.items });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update cart item' });
  }
};

// DELETE /api/cart/:bookId
export const removeFromCart = async (req: any, res: Response) => {
  try {
    const userId = req.user._id;
    const { bookId } = req.params;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = cart.items.filter(
      (item: any) => item.book.toString() !== bookId
    );

    await cart.save();

    res.status(200).json({ success: true, items: cart.items });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove item' });
  }
};

// DELETE /api/cart
export const clearCart = async (req: any, res: Response) => {
  try {
    const userId = req.user._id;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = [];
    await cart.save();

    res.status(200).json({ success: true, items: [] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear cart' });
  }
};
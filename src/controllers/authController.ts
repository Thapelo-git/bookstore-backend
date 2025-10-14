import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User';
import { LoginCredentials, RegisterCredentials, AuthRequest } from '../types/book';
import BlacklistedToken from '../models/BlacklistedToken';
import { createSession, removeSession } from '../middleware/auth';
export const register = async (req: Request<{}, {}, RegisterCredentials>, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists' 
      });
    }

    // ✅ FIXED: Just create the user - let the pre-save hook handle hashing
    user = new User({ name, email, password });
    
    console.log('🔑 Before save - password (plain text):', user.password);
    
    // The pre-save hook in User model will automatically hash the password
    await user.save();

    console.log('✅ User saved with auto-hashed password');

    const payload = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.status(201).cookie("Token",token).json({
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          },
           message: 'Registration successful'
        });
      }
    );
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

export const login = async (req: Request<{}, {}, LoginCredentials>, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    if (!password) {
      console.log('❌ Password missing in request');
      return res.status(400).json({ 
        success: false,
        message: 'Password is required' 
      });
    }

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }
   
    console.log('✅ User found:', user.email);
    console.log('🔑 Stored password hash:', user.password ? 'EXISTS' : 'MISSING');
    console.log('🔑 Input password:', password);
    
    console.log('🔐 Starting password comparison...');
    const isMatch = await user.comparePassword(password);
    console.log('🔐 Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Password incorrect for user:', email);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid password' 
      });
    }

    console.log('✅ Password correct, generating token...');
    
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
         createSession(user.id, token);
          res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production', // HTTPS in production
          sameSite: 'strict',
          maxAge: 1 * 24 * 60 * 60 * 1000 // 7 days
        });
        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          },
            message: 'Login successful'
        });
      }
    );
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { name, email } = req.body;

    // Check if email is being updated and if it already exists
    if (email && email !== req.user?.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const user = await User.findByIdAndUpdate(
      req.user?.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Find user with password field included
    const user = await User.findById(req.user?.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    // ✅ FIXED: Just set the new password - pre-save hook will hash it
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No token provided'
      });
    }
     if (req.user?.id) {
      removeSession(req.user.id);
    }

    // Decode token to get expiration
    const decoded = jwt.decode(token) as any;
    
    if (decoded && decoded.exp) {
      // Add token to blacklist
      await BlacklistedToken.create({
        token,
        userId: req.user?.id,
        expiresAt: new Date(decoded.exp * 1000),
        reason: 'logout'
      });
    }

    res.clearCookie('token');
    res.json({
      success: true,
      message: 'Logout successful. Token has been invalidated.'
    });
  } catch (err: any) {
    console.error('Logout error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error during logout' 
    });
  }
};
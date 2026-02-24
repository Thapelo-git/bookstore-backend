import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import User from '../models/User';
import * as crypto from  'crypto'
import { LoginCredentials, RegisterCredentials, AuthRequest } from '../types/book';
import BlacklistedToken from '../models/BlacklistedToken';
import { createSession, removeSession } from '../middleware/auth';
import { sendEmail } from '../services/emailServices';
export const register = async (req: Request<{}, {}, RegisterCredentials>, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { name, email, password , role} = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists' 
      });
    } 

   const userRole = role === 'admin' || role === 'author' ? 'client' : (role || 'client');

    user = new User({ name, email, password, role: userRole });
    
    console.log('🔑 Before save - password (plain text):', user.password);
    
    await user.save();

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
     if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
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
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    console.log('🔐 Forgot password request for:', email);

    // Find user by email
    const user = await User.findOne({ email });
    
    // Always return success to prevent email enumeration
    if (!user) {
      console.log('📧 User not found, but returning success for security');
      return res.json({
        success: true,
        message: 'If an account with that email exists, reset instructions have been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    
    // Set token expiry (1 hour)
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // Save reset token and expiry to user
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    console.log('✅ Reset token generated for user:', user.email);

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    // Send email
    await sendPasswordResetEmail(user.email, user.name, resetUrl);

    res.json({
      success: true,
      message: 'If an account with that email exists, reset instructions have been sent.'
    });
  } catch (err: any) {
    console.error('❌ Forgot password error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error processing password reset' 
    });
  }
};




export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, email, newPassword } = req.body;

    console.log('🔐 Reset password request for:', email);

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and email are required'
      });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find user by email and valid reset token
    const user = await User.findOne({
      email: email,
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    console.log('✅ Password reset successful for user:', user.email);

    // Send confirmation email
    await sendPasswordResetConfirmationEmail(user.email, user.name);

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (err: any) {
    console.error('❌ Reset password error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error resetting password' 
    });
  }
};

// Email Service Functions
const sendPasswordResetEmail = async (email: string, name: string, resetUrl: string) => {
  const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .button { 
          display: inline-block; 
          background: #4F46E5; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 20px 0; 
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this reset, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Your App Name. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    // Using nodemailer or your email service
    await sendEmail({
      to: email,
      subject: 'Reset Your Password',
      html: emailContent
    });
    console.log('✅ Password reset email sent to:', email);
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};

const sendPasswordResetConfirmationEmail = async (email: string, name: string) => {
  const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Successful</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>Your password has been successfully reset.</p>
          <p>If you did not make this change, please contact our support team immediately.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Your App Name. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      to: email,
      subject: 'Password Reset Successful',
      html: emailContent
    });
    console.log('✅ Password reset confirmation email sent to:', email);
  } catch (error) {
    console.error('❌ Failed to send confirmation email:', error);
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
import express from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,logout,forgotPassword,
  resetPassword
} from '../controllers/authController';
import { auth } from '../middleware/auth';
import {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,forgotPasswordValidation,
  resetPasswordValidation
} from '../middleware/authValidation';
import { handleValidationErrors } from '../middleware/validationHandler';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', registerValidation, handleValidationErrors, register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginValidation, handleValidationErrors, login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, getMe);

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, updateProfileValidation, handleValidationErrors, updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, changePasswordValidation, handleValidationErrors, changePassword);
router.post('/logout', auth, logout);

router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, forgotPassword);
router.post('/reset-password', resetPasswordValidation, handleValidationErrors, resetPassword);

export default router;
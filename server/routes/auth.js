const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');
const { refresh } = require('../middleware/auth');

// POST /api/v1/auth/signup - User login
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const user = await User.create({
      email: email,
      password: password,
      firstName: firstName,
      lastName: lastName,
      role: role,
    });
    const accessToken = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id, role: user.role });

    return res.json({
      message: 'Signup successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Internal Server error', error: error.message });
  }
});

// POST /api/v1/auth/login - User login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const okPw = await user.comparePassword(password);
    if (!okPw) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const accessToken = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id, role: user.role });

    return res.json({
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tokens: { accessToken, refreshToken },
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Internal Server error', error: error.message });
  }
});

// POST /api/v1/auth/refresh - Refresh access token
router.post('/refresh', refresh);

module.exports = router;

import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config.js';
import { AppError, validationError } from '../lib/AppError.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authenticate, loadAuthContext, serializeProfile } from '../middleware/auth.js';
import User from '../models/User.js';

const router = Router();

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      throw validationError('Email and password are required');
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !passwordOk) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    if (user.status !== 'ACTIVE') throw new AppError(403, 'USER_INACTIVE', 'This account is inactive');

    const auth = await loadAuthContext(user);
    const token = jwt.sign({ sub: String(user._id) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
    res.json({ success: true, token, user: serializeProfile(auth) });
  }),
);

router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: serializeProfile(req.auth) });
});

export default router;

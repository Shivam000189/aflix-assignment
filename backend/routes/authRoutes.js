const express = require('express');
const router = express.Router();
const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/authMIddleware');

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;


router.post('/register', async (req, res) => {
    try {
        const { email, password, name, role, phone } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        if (!EMAIL_REGEX.test(normalizedEmail)) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
        }

        if (String(password).length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
        }

        // Unique constraint check
        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }

        // All self-registered accounts are strictly given the 'user' role.
        // Manager, Admin, and team lead accounts are hardcoded and provisioned internally.
        const userRole = 'user';

        const salt = await bcrypt.genSalt(10);
        const hashPassword = await bcrypt.hash(password, salt);

        const userName = name ? String(name).trim() : normalizedEmail.split('@')[0];

        const newUser = await prisma.user.create({
            data: {
                name: userName,
                email: normalizedEmail,
                password: hashPassword,
                role: userRole,
                phone: phone ? String(phone).trim() : '',
                isActive: true
            }
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                _id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }
        console.error('Registration error:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
                msg: 'All fields are required'
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail }
        });

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                msg: 'Invalid email or password'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
                msg: 'Invalid email or password'
            });
        }

        const SECRET_KEY = process.env.SECRET_KEY || process.env.JWT_SECRET;
        if (!SECRET_KEY) {
            console.error('Missing SECRET_KEY environment variable');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error: missing secret key',
                msg: 'Server configuration error'
            });
        }

        const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, name: user.name },
            SECRET_KEY,
            { expiresIn }
        );

        return res.status(200).json({
            success: true,
            message: 'Login Successfully',
            msg: 'Login Successfully',
            token,
            user: {
                id: user.id,
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error, please try again later',
            msg: 'Server error, please try again later'
        });
    }
});


router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            user: { ...user, _id: user.id }
        });
    } catch (err) {
        console.error('Error fetching authenticated user:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


router.get('/users', authMiddleware, async (req, res) => {
    try {
        if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: requires administrator or manager privileges'
            });
        }

        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                createdAt: true
            },
            orderBy: { name: 'asc' }
        });

        const formattedUsers = users.map(u => ({
            ...u,
            _id: u.id
        }));

        res.status(200).json({ success: true, count: formattedUsers.length, users: formattedUsers });
    } catch (err) {
        console.error('Error fetching users:', err.message);
        res.status(500).json({ success: false, message: 'Server error fetching users' });
    }
});

module.exports = router;
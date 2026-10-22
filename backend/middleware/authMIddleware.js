const jwt = require('jsonwebtoken');


function authMiddleware(req, res, next) {
    const SECRET_KEY = process.env.SECRET_KEY || process.env.JWT_SECRET;

    if (!SECRET_KEY) {
        return res.status(500).json({
            success: false,
            message: 'Server configuration error: missing secret key',
            msg: 'Server configuration error'
        });
    }

    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : authHeader;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No authentication token provided.',
            msg: 'Access denied. No token provided.'
        });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired authentication token',
            msg: 'Invalid or expired token'
        });
    }
}

module.exports = authMiddleware;
module.exports.authMiddler = authMiddleware;
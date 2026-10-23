require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const connectDB = require('./config/db');
const authMiddleware = require('./middleware/authMIddleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public Auth Routes (Register, Login, Me)
app.use('/api/auth', require('./routes/authRoutes'));

// Public Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'postgresql', orm: 'prisma', time: new Date().toISOString() });
});

// Protected Leads Routes (Requires valid JWT Bearer token)
app.use('/api/leads', authMiddleware, require('./routes/LeadRoutes'));
app.use('/api/lead', authMiddleware, require('./routes/LeadRoutes')); // Alias for flexibility

// API 404 Guard: Ensure unhandled /api/* requests return JSON 404 and never HTML
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: `API endpoint '${req.method} ${req.originalUrl}' not found`
    });
});

// Resolve built frontend distribution directory (checks ../frotend/dist, ../frontend/dist, ../frotend)
const possibleDistPaths = [
    path.resolve(__dirname, '../frotend/dist'),
    path.resolve(__dirname, '../frontend/dist'),
    path.resolve(__dirname, '../frotend')
];
const frontendDistPath = possibleDistPaths.find(p => fs.existsSync(p));

if (frontendDistPath) {
    app.use(express.static(frontendDistPath));

    // Client-side SPA routing fallback: serve index.html for non-API client routes
    app.use((req, res) => {
        const indexPath = path.join(frontendDistPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).json({
                success: false,
                message: 'Frontend application build not found. Run npm run build in the frontend directory.'
            });
        }
    });
}

const PORT = parseInt(process.env.PORT, 10) || 5000;

async function startServer() {
    try {
        // 1. Establish database connection before accepting traffic
        await connectDB();

        // 2. Start HTTP server
        const server = app.listen(PORT, () => {
            console.log(` Server is running on port ${PORT}`);
        });

        // 3. Handle port conflicts cleanly
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`\n Error: Port ${PORT} is already in use by another process.`);
                console.error(`Tip: Close the process using port ${PORT} or change PORT in backend/.env`);
            } else {
                console.error(' Server startup error:', err.message);
            }
            process.exit(1);
        });

        // 4. Graceful shutdown on Ctrl+C or termination
        const handleShutdown = async (signal) => {
            console.log(`\nReceived ${signal}. Shutting down gracefully...`);
            server.close(async () => {
                const { prisma } = require('./config/db');
                await prisma.$disconnect();
                console.log('PostgreSQL connection closed. Process exited.');
                process.exit(0);
            });
        };

        process.on('SIGINT', () => handleShutdown('SIGINT'));
        process.on('SIGTERM', () => handleShutdown('SIGTERM'));

    } catch (err) {
        console.error(' Fatal error starting server:', err.message);
        process.exit(1);
    }
}

startServer();

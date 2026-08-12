const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("./models/User");

const app = express();

// Token blacklist for logout
const tokenBlacklist = [];

// Middleware
app.use(express.json());
app.use(express.static("public"));

// ===============================
// CONNECT TO MONGODB
// ===============================

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully!");
    })
    .catch((error) => {
        console.log(
            "MongoDB Connection Error:",
            error.message
        );
    });

// ===============================
// HOME ROUTE
// ===============================

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// ===============================
// SIGNUP
// ===============================

app.post("/signup", async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            role
        } = req.body;

        // Check required fields
        if (!name || !email || !password) {

            return res.status(400).json({
                message:
                    "Name, email and password are required"
            });
        }

        // Check duplicate email
        const existingUser =
            await User.findOne({ email });

        if (existingUser) {

            return res.status(400).json({
                message:
                    "Email already registered"
            });
        }

        // Hash password
        const hashedPassword =
            await bcrypt.hash(password, 10);

        // Create user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role: role || "user"
        });

        await newUser.save();

        res.status(201).json({
            message:
                "User created successfully"
        });

    } catch (error) {

        res.status(500).json({
            message:
                "Error creating user",
            error:
                error.message
        });
    }
});

// ===============================
// LOGIN
// ===============================

app.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        // Find user
        const user =
            await User.findOne({ email });

        if (!user) {

            return res.status(400).json({
                message:
                    "User not found"
            });
        }

        // Compare password
        const isMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!isMatch) {

            return res.status(400).json({
                message:
                    "Invalid credentials"
            });
        }

        // Create JWT
        const token =
            jwt.sign(
                {
                    id: user._id,
                    role: user.role
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "1h"
                }
            );

        res.json({
            message:
                "Login successful",
            token: token
        });

    } catch (error) {

        res.status(500).json({
            message:
                "Login error",
            error:
                error.message
        });
    }
});

// ===============================
// AUTHENTICATION MIDDLEWARE
// ===============================

function auth(req, res, next) {

    const token =
        req.header("Authorization")
            ?.replace("Bearer ", "");

    // No token
    if (!token) {

        return res.status(401).json({
            message:
                "No token, access denied"
        });
    }

    // Check blacklist
    if (tokenBlacklist.includes(token)) {

        return res.status(401).json({
            message:
                "Token has been logged out"
        });
    }

    try {

        const verified =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        req.user = verified;

        next();

    } catch (error) {

        return res.status(400).json({
            message:
                "Invalid token"
        });
    }
}

// ===============================
// PROFILE - PROTECTED ROUTE
// ===============================

app.get(
    "/profile",
    auth,
    async (req, res) => {

        try {

            const user =
                await User.findById(
                    req.user.id
                ).select("-password");

            if (!user) {

                return res.status(404).json({
                    message:
                        "User not found"
                });
            }

            res.json(user);

        } catch (error) {

            res.status(500).json({
                message:
                    "Error fetching profile"
            });
        }
    }
);

// ===============================
// ADMIN AUTHORIZATION MIDDLEWARE
// ===============================

function adminOnly(req, res, next) {

    if (req.user.role !== "admin") {

        return res.status(403).json({
            message:
                "Admin access required"
        });
    }

    next();
}

// ===============================
// ADMIN PROTECTED ROUTE
// ===============================

app.get(
    "/admin",
    auth,
    adminOnly,
    (req, res) => {

        res.json({
            message:
                "Welcome to the Admin Dashboard!"
        });
    }
);

// ===============================
// LOGOUT
// ===============================

app.post(
    "/logout",
    auth,
    (req, res) => {

        const token =
            req.header("Authorization")
                ?.replace("Bearer ", "");

        tokenBlacklist.push(token);

        res.json({
            message:
                "Logout successful"
        });
    }
);

// ==================================================
// DAY 17 - USER CRUD API
// ==================================================

// ===============================
// GET ALL USERS
// ===============================

app.get(
    "/users",
    auth,
    async (req, res) => {

        try {

            const users =
                await User.find()
                    .select("-password");

            res.json(users);

        } catch (error) {

            res.status(500).json({
                message:
                    "Error fetching users"
            });
        }
    }
);

// ===============================
// POST USER
// ===============================

app.post(
    "/users",
    auth,
    async (req, res) => {

        try {

            const {
                name,
                email,
                age
            } = req.body;

            // Validate fields
            if (!name || !email) {

                return res.status(400).json({
                    message:
                        "Name and email are required"
                });
            }

            // Check duplicate email
            const existingUser =
                await User.findOne({ email });

            if (existingUser) {

                return res.status(400).json({
                    message:
                        "Email already registered"
                });
            }

            // Create a hashed placeholder
            // password for dashboard-created users
            const hashedPassword =
                await bcrypt.hash(
                    "dashboard-user",
                    10
                );

            const user =
                new User({
                    name,
                    email,
                    age,
                    password: hashedPassword,
                    role: "user"
                });

            const savedUser =
                await user.save();

            const responseUser =
                savedUser.toObject();

            delete responseUser.password;

            res.status(201).json(
                responseUser
            );

        } catch (error) {

            res.status(400).json({
                message:
                    "Error creating user",
                error:
                    error.message
            });
        }
    }
);

// ===============================
// PUT USER
// ===============================

app.put(
    "/users/:id",
    auth,
    async (req, res) => {

        try {

            // Don't allow password or role
            // to be changed through dashboard
            const {
                name,
                email,
                age,
                isActive
            } = req.body;

            const updatedData = {
                name,
                email,
                age,
                isActive
            };

            // Remove undefined fields
            Object.keys(updatedData)
                .forEach(key => {

                    if (
                        updatedData[key] ===
                        undefined
                    ) {
                        delete updatedData[key];
                    }
                });

            const user =
                await User.findByIdAndUpdate(
                    req.params.id,
                    updatedData,
                    {
                        new: true,
                        runValidators: true
                    }
                ).select("-password");

            if (!user) {

                return res.status(404).json({
                    message:
                        "User not found"
                });
            }

            res.json(user);

        } catch (error) {

            res.status(400).json({
                message:
                    "Error updating user",
                error:
                    error.message
            });
        }
    }
);

// ===============================
// DELETE USER
// ===============================

app.delete(
    "/users/:id",
    auth,
    async (req, res) => {

        try {

            const user =
                await User.findByIdAndDelete(
                    req.params.id
                );

            if (!user) {

                return res.status(404).json({
                    message:
                        "User not found"
                });
            }

            res.json({
                message:
                    "User deleted successfully"
            });

        } catch (error) {

            res.status(400).json({
                message:
                    "Error deleting user"
            });
        }
    }
);

// ===============================
// START SERVER
// ===============================

app.listen(3000, () => {

    console.log(
        "Server running at http://localhost:3000"
    );
});
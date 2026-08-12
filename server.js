const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("./models/user");

const app = express();


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json());

app.use(express.static("public"));


// =====================================================
// TOKEN BLACKLIST
// =====================================================

const tokenBlacklist = [];


// =====================================================
// CONNECT TO MONGODB
// =====================================================

mongoose.connect(process.env.MONGO_URI)

    .then(() => {

        console.log(
            "MongoDB Connected Successfully!"
        );

    })

    .catch((error) => {

        console.log(
            "MongoDB Connection Error:",
            error.message
        );

    });


// =====================================================
// HOME ROUTE
// =====================================================

app.get("/", (req, res) => {

    res.sendFile(
        __dirname + "/public/index.html"
    );

});


// =====================================================
// SIGNUP
// =====================================================

app.post("/signup", async (req, res) => {

    try {

        const {
            name,
            email,
            password,
            role
        } = req.body;


        if (!name || !email || !password) {

            return res.status(400).json({

                message:
                    "Name, email and password are required"

            });

        }


        const existingUser =
            await User.findOne({ email });


        if (existingUser) {

            return res.status(400).json({

                message:
                    "Email already registered"

            });

        }


        const hashedPassword =
            await bcrypt.hash(
                password,
                10
            );


        const newUser =
            new User({

                name,

                email,

                password:
                    hashedPassword,

                role:
                    role || "user"

            });


        await newUser.save();


        res.status(201).json({

            message:
                "User created successfully"

        });


    } catch (error) {

        console.error(
            "Signup error:",
            error
        );


        res.status(500).json({

            message:
                "Error creating user",

            error:
                error.message

        });

    }

});


// =====================================================
// LOGIN
// =====================================================

app.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        const user =
            await User.findOne({ email });


        if (!user) {

            return res.status(400).json({

                message:
                    "User not found"

            });

        }


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


        const token =
            jwt.sign(

                {
                    id:
                        user._id,

                    role:
                        user.role

                },

                process.env.JWT_SECRET,

                {
                    expiresIn:
                        "1h"
                }

            );


        res.json({

            message:
                "Login successful",

            token

        });


    } catch (error) {

        console.error(
            "Login error:",
            error
        );


        res.status(500).json({

            message:
                "Login error",

            error:
                error.message

        });

    }

});


// =====================================================
// AUTHENTICATION MIDDLEWARE
// =====================================================

function auth(req, res, next) {

    const token =
        req.header("Authorization")
            ?.replace(
                "Bearer ",
                ""
            );


    if (!token) {

        return res.status(401).json({

            message:
                "No token, access denied"

        });

    }


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


        req.user =
            verified;


        next();


    } catch (error) {

        return res.status(400).json({

            message:
                "Invalid token"

        });

    }

}


// =====================================================
// PROFILE
// =====================================================

app.get(
    "/profile",
    auth,
    async (req, res) => {

        try {

            const user =
                await User.findById(
                    req.user.id
                )
                .select("-password");


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


// =====================================================
// ADMIN MIDDLEWARE
// =====================================================

function adminOnly(req, res, next) {

    if (
        req.user.role !== "admin"
    ) {

        return res.status(403).json({

            message:
                "Admin access required"

        });

    }


    next();

}


// =====================================================
// ADMIN ROUTE
// =====================================================

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


// =====================================================
// LOGOUT
// =====================================================

app.post(
    "/logout",
    auth,
    (req, res) => {

        const token =
            req.header("Authorization")
                ?.replace(
                    "Bearer ",
                    ""
                );


        tokenBlacklist.push(token);


        res.json({

            message:
                "Logout successful"

        });

    }
);


// =====================================================
// GET ALL USERS
// =====================================================

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

            console.error(
                "Get users error:",
                error
            );


            res.status(500).json({

                message:
                    "Error fetching users"

            });

        }

    }
);


// =====================================================
// ADD USER
// =====================================================

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


            if (
                !name ||
                !email ||
                !age
            ) {

                return res.status(400).json({

                    message:
                        "Name, email and age are required"

                });

            }


            // Generate a password for dashboard users

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

                    password:
                        hashedPassword

                });


            const savedUser =
                await user.save();


            const safeUser =
                savedUser.toObject();


            delete safeUser.password;


            res.status(201).json(
                safeUser
            );


        } catch (error) {

            console.error(
                "Add user error:",
                error
            );


            res.status(400).json({

                message:
                    "Error creating user",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// UPDATE USER
// =====================================================

app.put(
    "/users/:id",
    auth,
    async (req, res) => {

        try {

            const user =
                await User.findByIdAndUpdate(

                    req.params.id,

                    req.body,

                    {
                        new: true,

                        runValidators: true

                    }

                )
                .select("-password");


            if (!user) {

                return res.status(404).json({

                    message:
                        "User not found"

                });

            }


            res.json(user);


        } catch (error) {

            console.error(
                "Update user error:",
                error
            );


            res.status(400).json({

                message:
                    "Error updating user",

                error:
                    error.message

            });

        }

    }
);


// =====================================================
// DELETE USER
// =====================================================

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

            console.error(
                "Delete user error:",
                error
            );


            res.status(400).json({

                message:
                    "Error deleting user"

            });

        }

    }
);


// =====================================================
// START SERVER
// =====================================================

const PORT =
    process.env.PORT || 3000;


app.listen(
    PORT,
    () => {

        console.log(
            `Server running on port ${PORT}`
        );

    }
);
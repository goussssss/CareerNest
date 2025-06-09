const express = require("express");
const path = require("path");
const userRoute = require("./routes/user");
const blogRoute = require("./routes/blog");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const { checkForAuthenticationCookie } = require("./middlewares/authentication");

const Blog = require("./models/blog");

const app = express();
const PORT = 8000;

mongoose
    .connect('mongodb://localhost:27017/nest')
    .then(e => console.log("MongoDB connected"))
    .catch(err => console.error("MongoDB connection error:", err));

app.set("view engine", "ejs");
app.set('views', path.resolve("./views"));

app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(checkForAuthenticationCookie("token")); 
app.use(express.static(path.resolve("./public")));

app.get("/", async (req, res) => {
    const allBlogs = await Blog.find({}).populate("createdBy");
    return res.render("home", {
        user: req.user,
        blogs: allBlogs,
    }); 
});

app.use("/user", userRoute);
app.use("/blog", blogRoute);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', { 
        error: err.message || 'Something went wrong!',
        user: req.user 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', { 
        error: 'Page not found',
        user: req.user 
    });
});

app.listen(PORT, () => 
    console.log(`CareerNest server is running on port ${PORT} perfectly...`));
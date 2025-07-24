const { Router } = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = Router();

const Blog = require("../models/blog");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve(`./public/uploads/`));
    },
    filename: function (req, file, cb) {
        const fileName = `${Date.now()}-${file.originalname}`;
        cb(null, fileName);
    },
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Accept images and PDFs
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only images and PDF files are allowed!'));
        }
    }
});

// Upload middleware that handles both image and PDF files
const uploadFiles = upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'pdfFile', maxCount: 1 }
]);

router.get('/add-new', (req, res) => {
    return res.render("addBlog", {
        user: req.user,
    });
});

router.post("/", uploadFiles, async (req, res) => {
    const { title, body } = req.body;

    const blogData = {
        body,
        title,
        createdBy: req.user._id,
    };

    if (req.files.coverImage) {
        blogData.coverImageURL = `/uploads/${req.files.coverImage[0].filename}`;
    }

    if (req.files.pdfFile) {
        blogData.pdfURL = `/uploads/${req.files.pdfFile[0].filename}`;
    }

    const blog = await Blog.create(blogData);
    return res.redirect(`/blog/${blog._id}`);
});

router.get("/edit/:id", async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        // Check if blog exists
        if (!blog) {
            return res.status(404).render('error', {
                error: 'Blog not found',
                user: req.user
            });
        }

        // Check if current user is the author
        if (blog.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', {
                error: 'You are not authorized to edit this blog',
                user: req.user
            });
        }

        return res.render('editBlog', {
            user: req.user,
            blog,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).render('error', {
            error: 'Server error',
            user: req.user
        });
    }
});

router.post("/update/:id", uploadFiles, async (req, res) => {
    try {
        const { title, body } = req.body;
        const blog = await Blog.findById(req.params.id);

        // Check if blog exists
        if (!blog) {
            return res.status(404).render('error', {
                error: 'Blog not found',
                user: req.user
            });
        }

        // Check if current user is the author
        if (blog.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', {
                error: 'Not authorized',
                user: req.user
            });
        }

        // Update blog data
        blog.title = title;
        blog.body = body;

        // Handle new cover image if uploaded
        if (req.files.coverImage) {
            // Delete old cover image if exists
            if (blog.coverImageURL) {
                const oldImagePath = path.join(__dirname, '../public', blog.coverImageURL);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            blog.coverImageURL = `/uploads/${req.files.coverImage[0].filename}`;
        }

        // Handle new PDF if uploaded
        if (req.files.pdfFile) {
            // Delete old PDF if exists
            if (blog.pdfURL) {
                const oldPDFPath = path.join(__dirname, '../public', blog.pdfURL);
                if (fs.existsSync(oldPDFPath)) {
                    fs.unlinkSync(oldPDFPath);
                }
            }
            blog.pdfURL = `/uploads/${req.files.pdfFile[0].filename}`;
        }

        await blog.save();
        return res.redirect(`/blog/${blog._id}`);
    } catch (error) {
        console.error(error);
        return res.status(500).render('error', {
            error: 'Server error',
            user: req.user
        });
    }
});

router.get("/delete/:id", async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id);

        // Check if blog exists
        if (!blog) {
            return res.status(404).render('error', {
                error: 'Blog not found',
                user: req.user
            });
        }

        // Check if current user is the author
        if (blog.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', {
                error: 'Not authorized',
                user: req.user
            });
        }

        // Delete associated files
        if (blog.coverImageURL) {
            const imagePath = path.join(__dirname, '../public', blog.coverImageURL);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        if (blog.pdfURL) {
            const pdfPath = path.join(__dirname, '../public', blog.pdfURL);
            if (fs.existsSync(pdfPath)) {
                fs.unlinkSync(pdfPath);
            }
        }

        // Delete the blog
        await Blog.deleteOne({ _id: req.params.id });
        return res.redirect('/');
    } catch (error) {
        console.error(error);
        return res.status(500).render('error', {
            error: 'Server error',
            user: req.user
        });
    }
});

router.get("/:id", async (req, res) => {
    const blog = await Blog.findById(req.params.id).populate("createdBy");
    return res.render('blog', {
        user: req.user,
        blog,
    });
});

module.exports = router;
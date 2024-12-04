const express = require("express");
const router = express.Router();
const { Cours } = require("../models/cours");
const { Category } = require("../models/categories");
const multer = require("multer");

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads");
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.split(" ").join("-");
    const extension = FILE_TYPE_MAP[file.mimetype] || "file";
    cb(null, `${fileName}-${Date.now()}.${extension}`);
  },
});

const uploadOptions = multer({ storage: storage });

// POST /api/cours - Create a new course
router.post("/", uploadOptions.single("image"), async (req, res) => {
  try {
    const { name, description, duration, intensityLevel, price, category } = req.body;

    // Validate if the category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(404).json({ message: "Category not found" });
    }

    let imagePath = "";
    if (req.file) {
      const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
      imagePath = `${basePath}${req.file.filename}`;
    }

    // Create a new course
    const cours = new Cours({
      name,
      description,
      duration,
      intensityLevel,
      price,
      category,
      image: imagePath || null, // Add the image field
    });

    // Save the course to the database
    const savedCours = await cours.save();
    res.status(201).json(savedCours);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).send("Internal Server Error");
  }
});
// GET /api/cours - Get all course types
router.get("/", async (req, res) => {
  try {
    // Fetch courses and populate the 'category' field
    const courses = await Cours.find().populate("category", "name");
    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.delete("/:id", (req, res) => {
  Cours.findByIdAndRemove(req.params.id)
    .then((Cours) => {
      if (Cours) {
        return res
          .status(200)
          .json({ success: true, message: "the cours is deleted!" });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "cours not found!" });
      }
    })
    .catch((err) => {
      return res.status(500).json({ success: false, error: err });
    });
});

router.get('/total', async (req, res) => {
  try {
    const count = await Cours.countDocuments(); 
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const course = await Cours.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        description: req.body.description,
        duration: req.body.duration,
        intensityLevel: req.body.intensityLevel,
        price: req.body.price,
        category: req.body.category
      },
      { new: true }
    );

    if (!course) return res.status(400).send("The course cannot be updated!");

    res.send(course);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;

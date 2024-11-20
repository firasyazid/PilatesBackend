const express = require("express");
const router = express.Router();
const { Coach } = require("../models/coach");
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


 
router.post("/", uploadOptions.single("image"), async (req, res) => {
  try {
    const { name, bio, expertise } = req.body;

    let imagePath = "";
    if (req.file) {
      const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
      imagePath = `${basePath}${req.file.filename}`;
    }

    // Create a new coach
    const coach = new Coach({
      name,
      bio,
      expertise,
      image: imagePath || null, // Set the image field to the path or null if no image is uploaded
    });

    // Save coach to the database
    const savedCoach = await coach.save();
    res.status(201).json(savedCoach);
  } catch (error) {
    console.error("Error creating coach:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.get('/total', async (req, res) => {
  try {
    const count = await Coach.countDocuments(); 
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/coaches - Create a new coach

// GET /api/coaches - Get all coaches
router.get("/", async (req, res) => {
  try {
    const coaches = await Coach.find();
    res.status(200).json(coaches);
  } catch (error) {
    console.error("Error fetching coaches:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.delete("/:id", (req, res) => {
  Coach.findByIdAndRemove(req.params.id)
      .then((user) => {
        if (user) {
          return res
            .status(200)
            .json({ success: true, message: "the coach is deleted!" });
        } else {
          return res
            .status(404)
            .json({ success: false, message: "coach not found!" });
        }
      })
      .catch((err) => {
        return res.status(500).json({ success: false, error: err });
      });
  });


  router.put('/:id', async (req, res) => {
    try {
      const coach = await Coach.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name,
          bio: req.body.bio,
          expertise: req.body.expertise,
         },
        { new: true }  
      );
  
      if (!coach) return res.status(400).send("The coach cannot be updated!");
  
      res.send(coach);
    } catch (error) {
      console.error("Error updating coach:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  

module.exports = router;

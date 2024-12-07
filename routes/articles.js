const express = require("express");
const router = express.Router();
const multer = require("multer");
const { Article } = require("../models/articles");
 
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

// POST /api/articles - Create a new article
router.post("/", uploadOptions.fields([{ name: "image" }, { name: "video" }]), async (req, res) => {
  try {
    const { title, content1, content2 } = req.body;

    if (!title || !content1 || !content2) {
      return res.status(400).json({ message: "Title, content1, and content2 are required." });
    }

    let imagePath = "";
    let videoPath = "";

    if (req.files && req.files.image) {
      const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
      imagePath = `${basePath}${req.files.image[0].filename}`;
    }

    if (req.files && req.files.video) {
      const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
      videoPath = `${basePath}${req.files.video[0].filename}`;
    }

    const article = new Article({
      title,
      content1,
      content2,
      image: imagePath,
      video: videoPath,
    });

    const savedArticle = await article.save();
    res.status(201).json({ success: true, data: savedArticle });
  } catch (error) {
    console.error("Error creating article:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// GET /api/articles - Get all articles
router.get(`/`, async (req, res) => {
  const userList = await Article.find();

  if (!userList) {
    res.status(500).json({ success: false });
  }
  res.status(200).send(userList);
});


// GET /api/articles/:id - Get a specific article by ID
router.get("/:id", async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ success: false, message: "Article not found" });
    }
    res.status(200).json({ success: true, data: article });
  } catch (error) {
    console.error("Error fetching article:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.delete("/:id", (req, res) => {
  Article.findByIdAndRemove(req.params.id)
    .then((user) => {
      if (user) {
        return res
          .status(200)
          .json({ success: true, message: "the Article is deleted!" });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "Article not found!" });
      }
    })
    .catch((err) => {
      return res.status(500).json({ success: false, error: err });
    });
});

router.put("/:articleId", async (req, res) => {
  try {
    const { articleId } = req.params;
    const { title, content1, content2 } = req.body;

    // Find the article by ID
    const article = await Article.findById(articleId);

    if (!article) {
      return res.status(404).send("Article not found");
    }

    // Update only the provided fields
    if (title) {
      article.title = title;
    }

    if (content1) {
      article.content1 = content1;
    }

    if (content2) {
      article.content2 = content2;
    }

    // Save the updated article
    await article.save();
    res.status(200).send(article);
  } catch (error) {
    console.error("Error updating article:", error);
    res.status(500).send("Error updating article");
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const { Coach } = require("../models/coach");

// POST /api/coaches - Create a new coach
router.post("/", async (req, res) => {
  try {
    const { name, bio, expertise } = req.body;

    // Create a new coach
    const coach = new Coach({
      name,
      bio,
      expertise,
    });

    // Save coach to the  
    const savedCoach = await coach.save();
    res.status(201).json(savedCoach);
  } catch (error) {
    console.error("Error creating coach:", error);
    res.status(500).send("Internal Server Error");
  }
});

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
    User.findByIdAndRemove(req.params.id)
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

module.exports = router;

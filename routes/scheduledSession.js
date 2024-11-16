const express = require("express");
const router = express.Router();
const { ScheduledSession } = require("../models/scheduledSession");
const { Cours } = require("../models/cours");
const { Coach } = require("../models/coach");
const moment = require("moment");

// POST /api/scheduledSessions - Create a new scheduled session
router.post("/", async (req, res) => {
  try {
    const { cours, coach, date, startTime, endTime, maxCapacity } = req.body;

    // Check if the referenced course and coach exist
    const courseExists = await Cours.findById(cours);
    const coachExists = await Coach.findById(coach);

    if (!courseExists) {
      return res.status(404).send("Course not found.");
    }
    if (!coachExists) {
      return res.status(404).send("Coach not found.");
    }

    // Create a new scheduled session
    const scheduledSession = new ScheduledSession({
      cours,
      coach,
      date,
      startTime,
      endTime,
      maxCapacity,
    });
    
    // Save the scheduled session to the database
    const savedSession = await scheduledSession.save();
    res.status(201).json(savedSession);
  } catch (error) {
    console.error("Error creating scheduled session:", error);
    res.status(500).send("Internal Server Error");
  }
});

// GET /api/scheduledSessions - Get all scheduled sessions with course and coach details
router.get("/", async (req, res) => {
  try {
    const sessions = await ScheduledSession.find()
      .populate("cours", "name description duration intensityLevel") // Populate course details
      .populate("coach", "name bio expertise"); // Populate coach details

    res.status(200).json(sessions);
  } catch (error) {
    console.error("Error fetching scheduled sessions:", error);
    res.status(500).send("Internal Server Error");
  }
});


// GET /api/scheduledSessions/today - Get scheduled sessions for the current day
router.get("/today", async (req, res) => {
    try {
      const todayStart = moment().startOf('day');
      const todayEnd = moment().endOf('day');
  
      const sessions = await ScheduledSession.find({
        date: {
          $gte: todayStart.toDate(),
          $lte: todayEnd.toDate(),
        }
      })
      .populate("cours", "name description duration intensityLevel")
      .populate("coach", "name bio expertise");
  
      res.status(200).json(sessions);
    } catch (error) {
      console.error("Error fetching today's sessions:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
// GET /api/scheduledSessions/week - Get scheduled sessions for the current week
router.get("/week", async (req, res) => {
    try {
      const startOfWeek = moment().startOf('isoWeek');  
      const endOfWeek = moment().endOf('isoWeek');      
  
      const sessions = await ScheduledSession.find({
        date: {
          $gte: startOfWeek.toDate(),
          $lte: endOfWeek.toDate(),
        }
      })
      .populate("cours", "name description duration intensityLevel")
      .populate("coach", "name bio expertise");
  
      res.status(200).json(sessions);
    } catch (error) {
      console.error("Error fetching this week's sessions:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
module.exports = router;

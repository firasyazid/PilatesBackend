const express = require("express");
const router = express.Router();
const { ScheduledSession } = require("../models/scheduledSession");
const { Cours } = require("../models/cours");
const { Coach } = require("../models/coach");
const moment = require("moment");

router.get("/:coursId", async (req, res) => {
  try {
    const { coursId } = req.params;

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate the start of the week (Monday)
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + daysToMonday);

    // Calculate the end of the week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    console.log(`Start of Week: ${startOfWeek}`);
    console.log(`End of Week: ${endOfWeek}`);

    // Query scheduled sessions for the current week
    const sessions = await ScheduledSession.find({
      cours: coursId,
      date: {
        $gte: startOfWeek, // Monday
        $lte: endOfWeek,   // Sunday
      },
    })
      .populate("cours")
      .populate("coach")
      .exec();

    // Respond with the data
    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des sessions :", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
});
router.get("/week/:coursId", async (req, res) => {
  try {
    const { coursId } = req.params;

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate the start of the week (Monday)
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() + daysToMonday);

    // Create an array for the entire week (Monday to Sunday)
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }

    // Query scheduled sessions for the entire week
    const sessions = await ScheduledSession.find({
      cours: coursId,
      date: {
        $gte: startOfWeek,
        $lte: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000), // End of the week
      },
    })
      .populate("cours")
      .populate("coach")
      .exec();

    // Group sessions by day
    const groupedSessions = {};
    week.forEach((day) => {
      const dayString = day.toLocaleDateString("fr-FR", { weekday: "long" }); // e.g., "Lundi"
      groupedSessions[dayString] = sessions.filter((session) => {
        const sessionDate = new Date(session.date);
        return (
          sessionDate.getFullYear() === day.getFullYear() &&
          sessionDate.getMonth() === day.getMonth() &&
          sessionDate.getDate() === day.getDate()
        );
      });
    });

    // Respond with grouped sessions
    res.status(200).json(groupedSessions);
  } catch (error) {
    console.error("Erreur lors de la récupération des sessions :", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
});


router.get("/next-week/:coursId", async (req, res) => {
  try {
    const { coursId } = req.params;

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate the start of the next week (Monday)
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const startOfNextWeek = new Date(today);
    startOfNextWeek.setDate(today.getDate() + daysToMonday + 7); // Add 7 days to move to the next week

    // Create an array for the entire next week (Monday to Sunday)
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfNextWeek);
      day.setDate(startOfNextWeek.getDate() + i);
      week.push(day);
    }

    // Query scheduled sessions for the next week
    const sessions = await ScheduledSession.find({
      cours: coursId,
      date: {
        $gte: startOfNextWeek,
        $lte: new Date(startOfNextWeek.getTime() + 6 * 24 * 60 * 60 * 1000), // End of next week
      },
    })
      .populate("cours")
      .populate("coach")
      .exec();

    // Group sessions by day
    const groupedSessions = {};
    week.forEach((day) => {
      const dayString = day.toLocaleDateString("fr-FR", { weekday: "long" }); // e.g., "Lundi"
      groupedSessions[dayString] = sessions.filter((session) => {
        const sessionDate = new Date(session.date);
        return (
          sessionDate.getFullYear() === day.getFullYear() &&
          sessionDate.getMonth() === day.getMonth() &&
          sessionDate.getDate() === day.getDate()
        );
      });
    });

    // Respond with grouped sessions
    res.status(200).json(groupedSessions);
  } catch (error) {
    console.error("Erreur lors de la récupération des sessions :", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur",
    });
  }
});


// POST /api/scheduledSessions - Create a new scheduled session
router.post("/", async (req, res) => {
  try {
    const { name,cours, coach, date, startTime, endTime, maxCapacity } = req.body;

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
      name,
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

  
  function getCurrentWeekRange() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Sunday) to 6 (Saturday)
  
    // Assuming week starts on Monday
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // Set to last Monday
    startOfWeek.setHours(0, 0, 0, 0);
  
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Set to Sunday of the current week
    endOfWeek.setHours(23, 59, 59, 999);
  
    return { startOfWeek, endOfWeek };
  }
  
  // GET /api/v1/bookings/weekly-bookings
  router.get('/weekly-bookings', async (req, res) => {
    const { startOfWeek, endOfWeek } = getCurrentWeekRange();
  
    try {
      const bookings = await ScheduledSession.aggregate([
        // Match only sessions within the current week
        {
          $match: {
            date: {
              $gte: startOfWeek,
              $lt: endOfWeek
            }
          }
        },
        // Join with the Cours collection to get the course name
        {
          $lookup: {
            from: "cours", // Confirm this matches the collection name in MongoDB
            localField: "cours",
            foreignField: "_id",
            as: "courseDetails"
          }
        },
        {
          $unwind: "$courseDetails"
        },
        // Group by course name and day of the week
        {
          $group: {
            _id: {
              courseName: "$courseDetails.name",
              dayOfWeek: { $dayOfWeek: "$date" }
            },
            totalBookings: { $sum: "$currentCapacity" }
          }
        },
        {
          $sort: { "_id.dayOfWeek": 1 }
        }
      ]);
  
      // Format output with French day names
      const daysOfWeek = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      const formattedData = bookings.map(booking => {
        return {
          courseName: booking._id.courseName,
          dayOfWeek: daysOfWeek[booking._id.dayOfWeek - 1],
          totalBookings: booking.totalBookings
        };
      });
  
      res.json(formattedData);
    } catch (err) {
      console.error('Error fetching weekly bookings:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  
  router.delete("/:id", (req, res) => {
    ScheduledSession.findByIdAndRemove(req.params.id)
      .then((user) => {
        if (user) {
          return res
            .status(200)
            .json({ success: true, message: "the ScheduledSession is deleted!" });
        } else {
          return res
            .status(404)
            .json({ success: false, message: "ScheduledSession not found!" });
        }
      })
      .catch((err) => {
        return res.status(500).json({ success: false, error: err });
      });
  });

  
  router.put("/:id", async (req, res) => {
    try {
      const updatedSession = await ScheduledSession.findByIdAndUpdate(
        req.params.id,
        {
          name: req.body.name,
          cours: req.body.cours,
          coach: req.body.coach,
          date: req.body.date,
          startTime: req.body.startTime,
          endTime: req.body.endTime,
          maxCapacity: req.body.maxCapacity,
          currentCapacity: req.body.currentCapacity,
        },
        { new: true }
      );
      if (!updatedSession)
        return res.status(404).send({ message: "Session not found" });
      res.status(200).send(updatedSession);
    } catch (error) {
      res.status(400).send({ message: "Error updating session", error });
    }
  });
  
  
module.exports = router;

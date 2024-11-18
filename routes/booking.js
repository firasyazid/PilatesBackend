const express = require("express");
const router = express.Router();
const { ScheduledSession } = require("../models/scheduledSession");
const { Booking } = require("../models/booking");

// POST /api/bookings - Create a booking for a scheduled session
router.post("/", async (req, res) => {
  try {
    const { scheduledSessionId, userId } = req.body;

    // Find the scheduled session by ID
    const scheduledSession = await ScheduledSession.findById(scheduledSessionId);

    if (!scheduledSession) {
      return res.status(404).send("Scheduled session not found.");
    }

    // Check if the session is fully booked
    if (scheduledSession.currentCapacity >= scheduledSession.maxCapacity) {
      return res.status(400).send("This session is fully booked.");
    }

    // Create a new booking
    const booking = new Booking({
      scheduledSession: scheduledSessionId,
      user: userId,
      status: "confirmed",
    });

    // Save the booking
    const savedBooking = await booking.save();

    // Increment the current capacity of the scheduled session
    scheduledSession.currentCapacity += 1;
    await scheduledSession.save();

    res.status(201).json(savedBooking);
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).send("Internal Server Error");
  }
});
//get all bookings
router.get("/", async (req, res) => {
    try {
      const bookings = await Booking.find()
        .populate({
          path: "scheduledSession",
          populate: [
            { path: "cours", select: "name description duration price intensityLevel" },
            { path: "coach", select: "name bio expertise" }
          ]
        })
        .populate("user", "name email");
  
      res.status(200).json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
// GET /api/bookings/:id - Get a specific booking by ID with populated details
router.get('/daily-bookings', async (req, res) => {
  try {
    const bookings = await Booking.aggregate([
      {
        $group: {
          _id: { date: "$date", classType: "$classType" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.date": 1 }
      }
    ]);

    const formattedData = bookings.reduce((acc, booking) => {
      const date = booking._id.date ? booking._id.date.toISOString().split('T')[0] : 'Unknown Date';
      const classType = booking._id.classType;
      const count = booking.count;

      // Initialize the date entry if it doesn't exist
      if (!acc[date]) {
        acc[date] = {};
      }

      // Add class type and count
      acc[date][classType] = count;
      return acc;
    }, {});

    res.json(formattedData);
  } catch (err) {
    console.error('Error fetching daily bookings:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Define the route with a dynamic ID after specific routes like /daily-bookings
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    res.json(booking);
  } catch (err) {
    console.error('Error fetching booking:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

  
module.exports = router;

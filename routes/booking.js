const express = require("express");
const router = express.Router();
const { ScheduledSession } = require("../models/scheduledSession");
const { Booking } = require("../models/booking");
const { User } = require("../models/user");

// POST /api/bookings - Create a booking for a scheduled session 
router.post("/", async (req, res) => {
  try {
    const { scheduledSessionId, userId } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur non trouvé." });
    }
    // Vérifier si l'utilisateur a encore des sessions disponibles
    if (user.sessionCount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Vous n'avez plus de sessions disponibles. Veuillez acheter un nouvel abonnement.",
      });
    }
    // Vérifier si la session planifiée existe
    const scheduledSession = await ScheduledSession.findById(scheduledSessionId);
    if (!scheduledSession) {
      return res.status(404).json({ success: false, message: "Session planifiée non trouvée." });
    }

    // Vérifier si la session est complète
    if (scheduledSession.currentCapacity >= scheduledSession.maxCapacity) {
      return res.status(400).json({ success: false, message: "Cette session est complète." });
    }

    // Créer une nouvelle réservation
    const booking = new Booking({
      scheduledSession: scheduledSessionId,
      user: userId,
      status: "confirmé",
    });

    // Sauvegarder la réservation
    const savedBooking = await booking.save();

    // Mettre à jour la capacité actuelle de la session
    scheduledSession.currentCapacity += 1;
    await scheduledSession.save();

    // Décrémenter le nombre de sessions disponibles pour l'utilisateur
    user.sessionCount -= 1;
    await user.save();

    res.status(201).json({
      success: true,
      message: "Réservation confirmée.",
      data: savedBooking,
    });
  } catch (error) {
    console.error("Erreur lors de la création de la réservation :", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
});
// POST /api/bookings - Create a booking for a scheduled session this is itt!!!
router.post("/reserver-sessions", async (req, res) => {
  try {
    const { userId, scheduledSessionId } = req.body;

    // Vérifier les IDs
    if (!userId || !scheduledSessionId) {
      return res.status(400).json({ success: false, message: "IDs manquants" });
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
    }

    // Vérifier si la session planifiée existe
    const session = await ScheduledSession.findById(scheduledSessionId).populate("cours");
    if (!session) {
      return res.status(404).json({ success: false, message: "Session non trouvée" });
    }

    // Vérifier si la session est complète
    if (session.currentCapacity >= session.maxCapacity) {
      return res.status(400).json({ success: false, message: "Session complète" });
    }

    // Vérifiez si l'utilisateur a des sessions disponibles
    if (user.sessionCount > 0) {
      // Utiliser une session disponible
      user.sessionCount -= 1;
      await user.save();

      // Créer une réservation
      const booking = new Booking({
        scheduledSession: scheduledSessionId,
        user: userId,
        status: "confirmé",
      });

      // Sauvegarder la réservation
      const savedBooking = await booking.save();

      // Mettre à jour la capacité actuelle de la session
      session.currentCapacity += 1;
      await session.save();

      return res.status(201).json({
        success: true,
        message: "Réservation confirmée en utilisant une session existante.",
        data: savedBooking,
      });
    }

    // Si pas de sessions disponibles, effectuer un paiement
    const prixSession = session.cours.price; // Récupérer le prix du cours associé

    // Simuler le paiement (à intégrer avec une API de paiement)
    // Pour cet exemple, on suppose que le paiement est réussi.

    // Créer une réservation
    const booking = new Booking({
      scheduledSession: scheduledSessionId,
      user: userId,
      status: "confirmé",
    });

    // Sauvegarder la réservation
    const savedBooking = await booking.save();

    // Mettre à jour la capacité actuelle de la session
    session.currentCapacity += 1;
    await session.save();
    res.status(201).json({
      success: true,
      message: "Réservation confirmée après paiement.",
      data: { booking: savedBooking, prix: prixSession },
    });
  } catch (error) {
    console.error("Erreur lors de la réservation :", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur" });
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
        .populate("user", "fullname");
  
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

router.delete("/:id", (req, res) => {
  Booking.findByIdAndRemove(req.params.id)
      .then((user) => {
        if (user) {
          return res
            .status(200)
            .json({ success: true, message: "the booking is deleted!" });
        } else {
          return res
            .status(404)
            .json({ success: false, message: "booking not found!" });
        }
      })
      .catch((err) => {
        return res.status(500).json({ success: false, error: err });
      });
  });

router.put("/:id/status", async (req, res) => {
    const { id } = req.params; // Get the booking ID from the URL
    const { status } = req.body; // Get the new status from the request body
  
    // Validate status
    if (!["confirmé", "annulé"].includes(status)) {
      return res.status(400).send("Invalid status. Must be 'confirmé' or 'annulé'.");
    }
  
    try {
      // Find the booking by ID and update the status
      const updatedBooking = await Booking.findByIdAndUpdate(
        id,
        { status },
        { new: true } // Return the updated booking
      );
  
      if (!updatedBooking) {
        return res.status(404).send("Booking not found.");
      }
  
      res.status(200).json(updatedBooking); // Return the updated booking
    } catch (error) {
      console.error("Error updating booking status:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  

  router.get("/:scheduledSessionId/users", async (req, res) => {
    try {
      const { scheduledSessionId } = req.params;
  
      // Find bookings for the given scheduled session ID
      const bookings = await Booking.find({ scheduledSession: scheduledSessionId }).populate("user", "fullname email phone");
  
      if (!bookings || bookings.length === 0) {
        return res.status(404).send("No users found for the given session.");
      }
  
      // Extract users from bookings
      const users = bookings.map((booking) => booking.user);
  
      res.status(200).json(users);
    } catch (error) {
      console.error("Error fetching users for the scheduled session:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
module.exports = router;

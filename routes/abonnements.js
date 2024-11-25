const express = require("express");
const router = express.Router();
const { Abonnement } = require("../models/abonnements");  

// Get all abonnements
router.get("/", async (req, res) => {
  try {
    const abonnements = await Abonnement.find();
    res.status(200).json(abonnements);
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur lors de la récupération des abonnements", error });
  }
});

// Get a single abonnement by ID
router.get("/:id", async (req, res) => {
  try {
    const abonnement = await Abonnement.findById(req.params.id);
    if (!abonnement) {
      return res.status(404).json({ success: false, message: "Abonnement non trouvé" });
    }
    res.status(200).json(abonnement);
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur lors de la récupération de l'abonnement", error });
  }
});

// Create a new abonnement
router.post("/", async (req, res) => {
  try {
    const { name, sessionCount, duration, price } = req.body;

    // Validation
    if (!name || !sessionCount || !duration || !price) {
      return res.status(400).json({ success: false, message: "Tous les champs sont requis" });
    }

    const abonnement = new Abonnement({
      name,
      sessionCount,
      duration,
      price,
    });

    const savedAbonnement = await abonnement.save();
    res.status(201).json(savedAbonnement);
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur lors de la création de l'abonnement", error });
  }
});

// Delete an abonnement by ID
router.delete("/:id", async (req, res) => {
  try {
    const abonnement = await Abonnement.findByIdAndRemove(req.params.id);
    if (!abonnement) {
      return res.status(404).json({ success: false, message: "Abonnement non trouvé" });
    }
    res.status(200).json({ success: true, message: "Abonnement supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Erreur lors de la suppression de l'abonnement", error });
  }
});

router.put("/:abonnementId", async (req, res) => {
  try {
    const { abonnementId } = req.params;
    const { name, sessionCount, duration, price } = req.body;

    // Find the abonnement by ID
    const abonnement = await Abonnement.findById(abonnementId);

    if (!abonnement) {
      return res.status(404).send("Abonnement not found");
    }

    // Update only the provided fields
    if (name) {
      abonnement.name = name;
    }

    if (sessionCount !== undefined) {
      abonnement.sessionCount = sessionCount;
    }

    if (duration !== undefined) {
      abonnement.duration = duration;
    }

    if (price !== undefined) {
      abonnement.price = price;
    }

    // Save the updated abonnement
    await abonnement.save();
    res.status(200).send(abonnement);
  } catch (error) {
    console.error("Error updating abonnement:", error);
    res.status(500).send("Error updating abonnement");
  }
});



module.exports = router;

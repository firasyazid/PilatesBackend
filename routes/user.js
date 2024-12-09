const { User } = require("../models/user");
const { Abonnement } = require ("../models/abonnements");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { Booking } = require("../models/booking");  

router.get('/last-user', async (req, res) => {
  try {
    const userList = await User.find().select("-passwordHash").sort({ _id: -1 }); // Limit to 1 to get the latest user

    if (!userList) {
      return res.status(500).json({ success: false, message: "No users found" });
    }
    res.status(200).send(userList);
  } catch (error) {
    console.error("Error fetching the last user:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.get('/total', async (req, res) => {
  try {
    const count = await User.countDocuments(); 
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});


router.post("/inscription", async (req, res) => {
  try {
    const { fullname, email, password, phone, isAdmin = false } = req.body;

    if (!fullname || !email || !password) {
      return res.status(400).send("Fullname, email, and password are required.");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("User with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      fullname,
      email,
      passwordHash,
      phone,
      isAdmin,  
    });

     const savedUser = await user.save();
    if (!savedUser) {
      return res.status(400).send("The user could not be created.");
    }

     res.status(201).send({
      id: savedUser.id,
      fullname: savedUser.fullname,
      email: savedUser.email,
      phone: savedUser.phone,
      isAdmin: savedUser.isAdmin,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).send("Error creating user");
  }
});


router.get(`/`, async (req, res) => {
  const userList = await User.find().select("-passwordHash").sort({ _id: -1 });

  if (!userList) {
    res.status(500).json({ success: false });
  }
  res.status(200).send(userList);
});

router.get("/:id", async (req, res) => {
  const user = await User.findById(req.params.id).select("-passwordHash");

  if (!user) {
    res
      .status(500)
      .json({ message: "The user with the given ID was not found." });
  }
  res.status(200).send(user);
});

router.put("/:id", async (req, res) => {
  try {
    const userExist = await User.findById(req.params.id);
    let newPassword;
    if (req.body.password) {
      newPassword = bcrypt.hashSync(req.body.password, 10);
    } else {
      newPassword = userExist.passwordHash;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        fullname: req.body.fullname,
        email: req.body.email,
        passwordHash: newPassword,
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
       },
      { new: true }
    );

    if (!user) return res.status(400).send("The user cannot be updated!");

   

    res.send(user);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/login", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    const secret = process.env.secret;

    if (!user) {
      return res.status(404).send("Utilisateur non trouvé");  
    }

    const isPasswordValid = await bcrypt.compare(req.body.password, user.passwordHash);
    if (isPasswordValid) {
      const token = jwt.sign(
        {
          userId: user.id,
          isAdmin: user.isAdmin,
        },
        secret,
        { expiresIn: "3d" }
      );

      return res.status(200).send({
        user: user.email,
        userId: user.id,
        token: token,
        isAdmin: user.isAdmin,
        fullname: user.fullname,
        phone: user.phone,
      });
    } else {
      return res.status(401).send("Mot de passe incorrect");  
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send("Erreur interne du serveur");  
  }
});

router.get(`/get/count`, async (req, res) => {
  const userCount = await User.countDocuments();
  if (!userCount) {
    res.status(500).json({ success: false });
  }
  res.send({
    userCount: userCount,
  });
});

router.delete("/:id", (req, res) => {
  User.findByIdAndRemove(req.params.id)
    .then((user) => {
      if (user) {
        return res
          .status(200)
          .json({ success: true, message: "the user is deleted!" });
      } else {
        return res
          .status(404)
          .json({ success: false, message: "user not found!" });
      }
    })
    .catch((err) => {
      return res.status(500).json({ success: false, error: err });
    });
});

router.put("/update/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, name, lastname, password, validation } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send("User not found");
    }

    if (email) {
      user.email = email;
    }

    if (name) {
      user.name = name;
    }

    if (lastname) {
      user.lastname = lastname;
    }

    if (password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      user.passwordHash = hashedPassword;
    }

    if (validation !== undefined) {
      user.validation = validation;
    }

    await user.save();
    res.status(200).send(user);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error updating user");
  }
});

router.post("/acheter-abonnement/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const abonnementId = req.body.abonnementId;
    // Vérifier les IDs
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(abonnementId)) {
      return res.status(400).send("ID utilisateur ou abonnement invalide");
    }

    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) return res.status(404).send("Utilisateur non trouvé");

    // Vérifier si l'abonnement existe
    const abonnement = await Abonnement.findById(abonnementId);
    if (!abonnement) return res.status(404).send("Abonnement non trouvé");

    // Vérifier si l'utilisateur a un abonnement actif ou s'il s'agit de son premier abonnement
    const currentDate = new Date();
    if (user.expirationDate && user.expirationDate > currentDate) {
      // L'utilisateur a un abonnement actif, cumule les sessions
      user.sessionCount += abonnement.sessionCount;

      // Prolonger la date d'expiration (en jours)
      user.expirationDate = new Date(
        user.expirationDate.setDate(user.expirationDate.getDate() + abonnement.duration)
      );
    } else {
      // Premier abonnement ou abonnement expiré
      user.sessionCount = abonnement.sessionCount; // Réinitialiser les sessions
      user.expirationDate = new Date(
        currentDate.setDate(currentDate.getDate() + abonnement.duration)
      ); // Définir une nouvelle date d'expiration
    }

    // Associer l'abonnement actuel
    user.abonnement = abonnement._id;

    // Sauvegarder les modifications
    const updatedUser = await user.save();

    // Réponse
    res.status(200).send({
      message: "Abonnement acheté avec succès",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Erreur lors de l'achat de l'abonnement :", error);
    res.status(500).send("Erreur interne du serveur");
  }
});

router.get("/users-by-abonnement/:abonnementId", async (req, res) => {
  try {
    const abonnementId = req.params.abonnementId;

     const users = await User.find({ abonnement: abonnementId }).select(
      "fullname phone email sessionCount expirationDate"
    );

    if (!users || users.length === 0) {
      return res.status(404).send("Aucun utilisateur trouvé pour cet abonnement");
    }

    res.status(200).send(users);
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs :", error);
    res.status(500).send("Erreur interne du serveur");
  }
});

router.get("/abonnement-user-count/:abonnementId", async (req, res) => {
  try {
    const abonnementId = req.params.abonnementId;

    // Count the number of users with the specified abonnement
    const userCount = await User.countDocuments({ abonnement: abonnementId });

    res.status(200).send({ abonnementId, userCount });
  } catch (error) {
    console.error("Erreur lors de la récupération du nombre d'utilisateurs :", error);
    res.status(500).send("Erreur interne du serveur");
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Vérifiez si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send("Utilisateur introuvable");
    }

    // Génération d'un token aléatoire à 5 chiffres
    const token = Math.floor(10000 + Math.random() * 90000); // Génère un nombre entre 10000 et 99999

    // Enregistrez le token et la date d'expiration
    user.tokenPassword = token; // Save directly as a number
    user.tokenPasswordExpiration = Date.now() + 60 * 60 * 1000; // Expiration dans 1 heure
    await user.save();

    // Configuration de Nodemailer
    const userTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "firasyazid4@gmail.com",
        pass: "cntnhhvujdsfzhig",
      },
    });

    // Email avec le token
    const userMailOptions = {
      from: "firasyazid4@gmail.com",
      to: user.email,
      subject: "Réinitialisation de mot de passe",
      html: `
        <html>
          <body>
            <p>Bonjour ${user.fullname},</p>
            <p>Voici votre code de réinitialisation de mot de passe :</p>
            <h3>${token}</h3>
            <p>Ce code expirera dans une heure.</p>
          </body>
        </html>
      `,
    };

    // Envoi de l'email
    userTransporter.sendMail(userMailOptions, function (error, info) {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "Échec de l'envoi de l'email" });
      } else {
        console.log("Email envoyé : " + info.response);
        return res
          .status(200)
          .json({ message: "Code de réinitialisation envoyé par email avec succès" });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Erreur serveur");
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    // Validate inputs
    if (!email || !token || !newPassword) {
      return res.status(400).send("Tous les champs sont obligatoires.");
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send("Utilisateur introuvable.");
    }

    // Check if the token matches and is not expired
    if (
      user.tokenPassword !== parseInt(token, 10) || // Compare token as a number
      user.tokenPasswordExpiration < Date.now()
    ) {
      return res.status(400).send("Token invalide ou expiré.");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and clear the token
    user.passwordHash = hashedPassword;
    user.tokenPassword = null; // Clear the token
    user.tokenPasswordExpiration = null; // Clear the expiration
    await user.save();

    return res.status(200).send("Mot de passe réinitialisé avec succès.");
  } catch (error) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    res.status(500).send("Erreur serveur.");
  }
});

router.put("/:id/email", async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

     if (!email) {
      return res.status(400).json({
        success: false,
        message: "Le champ email est obligatoire.",
      });
    }

     const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Cet email est déjà utilisé.",
      });
    }

     const updatedUser = await User.findByIdAndUpdate(
      id,
      { email },
      { new: true }  
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Email mis à jour avec succès.",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'email:", error);
    res.status(500).json({
      success: false,
      message: "Erreur interne du serveur.",
      error,
    });
  }
});

// PUT route to update the phone number of a user
router.put("/update-phone/:userId", async (req, res) => {
  const { userId } = req.params;
  const { phone } = req.body;

  try {
    // Validate input
    if (!phone) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    // Update the user's phone field
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { phone },
      { new: true } // Return the updated document
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Phone number updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while updating the phone number" });
  }
});

router.put("/update-password/:userId", async (req, res) => {
  const { userId } = req.params;
  const { currentPassword, newPassword } = req.body;

  try {
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Both current and new passwords are required.",
      });
    }

    // Fetch user from the database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify the current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Current password is incorrect." });
    }

    // Hash the new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update the user's password
    user.passwordHash = newPasswordHash;
    const updatedUser = await user.save();

    res.status(200).json({
      message: "Password updated successfully.",
      user: { id: updatedUser.id, email: updatedUser.email },
    });
  } catch (error) {
    console.error("Error updating password:", error);
    res
      .status(500)
      .json({ message: "An error occurred while updating the password." });
  }
});

router.get("/user-booking/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
     const bookings = await Booking.find({ user: userId })
      .populate("scheduledSession") 
       .populate("user", "-passwordHash")  
      .sort({ createdAt: -1 }); 

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No bookings found for this user.",
      });
    }

    res.status(200).json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while fetching bookings.",
    });
  }
});


module.exports = router;

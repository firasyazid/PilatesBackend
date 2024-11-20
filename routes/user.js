const { User } = require("../models/user");
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const nodemailer = require("nodemailer");
 
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
      isAdmin, // This will use the value provided in the request body or default to false
    });

    // Save the user to the database
    const savedUser = await user.save();
    if (!savedUser) {
      return res.status(400).send("The user could not be created.");
    }

    // Respond with success
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
      return res.status(400).send("User not found");
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

      // Include isAdmin in the response so the frontend can use it
      res.status(200).send({ user: user.email, userId: user.id, token: token, isAdmin: user.isAdmin  ,
          fullname: user.fullname,

      });
    } else {
      res.status(400).send("Password is incorrect");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
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

 




module.exports = router;

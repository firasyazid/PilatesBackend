const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  passwordHash: {
    type: String,
    default: null,
  },
  phone: {
    type: String,
    default: "",
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  abonnement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Abonnement",  
    default: null,
  },
  sessionCount: {
    type: Number,
    default: 0,  
  },

  expirationDate: {
    type: Date,
    default: null,  
  },
  tokenPassword: {
    type: Number,  
    default: null,
  },
  tokenPasswordExpiration: {
    type: Date,
    default: null,
  },
});

userSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

userSchema.set("toJSON", {
  virtuals: true,
});

exports.User = mongoose.model("User", userSchema);
exports.userSchema = userSchema;

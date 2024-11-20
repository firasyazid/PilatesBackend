const mongoose = require("mongoose");

const coursSchema = new mongoose.Schema({
  
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  duration: {
    type: Number,
    required: true, 
  },
  intensityLevel: {
    type: String,
    enum: ["Débutant", "Intermédiaire", "Avancé"],
     default: "Débutant",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  price: {
    type: Number,
    required: true,  
  },
});

coursSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

coursSchema.set("toJSON", {
  virtuals: true,
});

exports.Cours = mongoose.model("Cours", coursSchema);
exports.coursSchema = coursSchema;

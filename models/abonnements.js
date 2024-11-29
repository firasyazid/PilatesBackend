const mongoose = require("mongoose");

const abonnementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,  
  },
  sessionCount: {
    type: Number,
    required: true,  
  },
  duration: {
    type: Number,
    required: true,  
  },
  price: {
    type: Number,
    required: true,  
  },
  createdAt: {
    type: Date,
    default: Date.now,  
  },

});

abonnementSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

abonnementSchema.set("toJSON", {
  virtuals: true,
});

exports.Abonnement = mongoose.model("Abonnement", abonnementSchema);
exports.abonnementSchema = abonnementSchema;
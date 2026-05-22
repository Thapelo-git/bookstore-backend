import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    label: {
      type: String,
      required: true,
    },

    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Address = mongoose.model("Address", addressSchema);
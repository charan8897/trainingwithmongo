import { Schema } from "mongoose";

const permission = {
  type: {
    type: String,
    enum: ["frontend", "backend", "api"],
  },
  path: String,
  method: {
    type: String,
    enum: ["GET", "POST", "PUT", "DELETE"],
  },
};

const userTypeSchema = new Schema(
  {
    name: String,
    description: String,
    permissions: [permission],
  },
  { timestamps: true }
);

const userType = mongoose.model("UserType", userTypeSchema, "user_types");

export default userType;

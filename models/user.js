import { Schema } from "mongoose";

const userSchema = new Schema(
  {
    username: String,
    password: String,
    isActive: Boolean,
    status: {
      type: String,
      enum: ["active", "inactive", "disabled", "pending", "blocked", "deleted"],
    },
    userType: {
      type: Schema.Types.ObjectId,
      ref: "UserType",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(user.password, salt);
    user.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error(error);
  }
};

const User = mongoose.model("User", userSchema, "users");

export default User;

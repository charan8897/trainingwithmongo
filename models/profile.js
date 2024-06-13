import { Schema } from "mongoose";

const Location = {
  isDefault: Boolean,
  address1: String,
  address2: String,
  admin1: String,
  admin2: String,
  country: String,
  postalCode: String,
  latitude: Number,
  longitude: Number,
};

const ProfileSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    bio: String,
    isActive: Boolean,
    phone: String,
    website: String,
    fullName: String,
    avatar: {
      type: Schema.Types.ObjectId,
      ref: "files",
    },
    cover: {
      type: Schema.Types.ObjectId,
      ref: "files",
    },
    social: {
      facebook: String,
      twitter: String,
      linkedin: String,
      instagram: String,
      whatsapp: String,
    },
    isBussinessAccount: Boolean,
    personalAccount: {
      type: Schema.Types.ObjectId,
      ref: "profiles",
    },
    location: [Location],
  },
  { timestamps: true }
);

const Profile = mongoose.model("Profile", ProfileSchema, "profiles");

export default Profile;

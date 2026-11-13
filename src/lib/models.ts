import mongoose, { Schema, model, models, type Model, type InferSchemaType } from "mongoose";
import { STATUSES } from "./society";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["member", "admin"], default: "member" },
  },
  { timestamps: true },
);

const fileSchema = new Schema(
  {
    provider: { type: String, enum: ["cloudinary", "local"], required: true },
    key: { type: String, required: true },
    bytes: Number,
    width: Number,
    height: Number,
  },
  { _id: false },
);

const applicationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    applicationNo: { type: String, unique: true, sparse: true },

    name: { type: String, required: true, trim: true },
    guardianRelation: { type: String, trim: true },
    guardianName: { type: String, trim: true },
    age: Number,
    occupation: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    desam: { type: String, trim: true },
    village: { type: String, trim: true },
    taluk: { type: String, trim: true },

    aadhaarEnc: String,
    aadhaarHash: { type: String, unique: true, sparse: true },
    aadhaarLast4: String,

    nominee: {
      name: { type: String, trim: true },
      relation: { type: String, trim: true },
      age: Number,
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
      aadhaarEnc: String,
      aadhaarLast4: String,
    },

    shares: { type: Number, default: 1 },

    files: {
      photo: fileSchema,
      signature: fileSchema,
      aadhaarFront: fileSchema,
      aadhaarBack: fileSchema,
      nomineePhoto: fileSchema,
      nomineeAadhaarFront: fileSchema,
      nomineeAadhaarBack: fileSchema,
      payment: fileSchema, // screenshot of the membership-fee payment
      extra: { type: [fileSchema], default: [] },
    },

    // Membership fee paid by QR / UPI. `amount` is the fee at the time the screenshot was sent.
    payment: {
      amount: Number,
      ref: { type: String, trim: true }, // UPI transaction / UTR number typed by the member
      verified: { type: Boolean, default: false },
    },

    status: { type: String, enum: STATUSES, default: "submitted", index: true },
    aadhaarVerified: { type: Boolean, default: false },
    officeNote: { type: String, trim: true },
    membershipNo: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
    submittedAt: Date,
  },
  { timestamps: true },
);

const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });

// One document (_id "main") with settings the super admin changes from /admin/settings.
const settingsSchema = new Schema(
  {
    _id: { type: String, default: "main" },
    feeAmount: { type: Number, default: 0 }, // membership fee in rupees; 0 = no payment step
    upiId: { type: String, trim: true },
    payeeName: { type: String, trim: true },
    bankDetails: { type: String, trim: true },
    qr: fileSchema,
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export type ApplicationDoc = InferSchemaType<typeof applicationSchema> & {
  _id: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};
export type StoredFile = InferSchemaType<typeof fileSchema>;

export const User = (models.User as Model<UserDoc>) || model<UserDoc>("User", userSchema);
export const Application =
  (models.Application as Model<ApplicationDoc>) ||
  model<ApplicationDoc>("Application", applicationSchema);
const Counter =
  (models.Counter as Model<{ _id: string; seq: number }>) || model("Counter", counterSchema);

export type SettingsDoc = InferSchemaType<typeof settingsSchema> & { _id: string; updatedAt?: Date };
export const Settings =
  (models.Settings as Model<SettingsDoc>) || model<SettingsDoc>("Settings", settingsSchema);

export async function nextSeq(name: string): Promise<number> {
  const c = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return c!.seq;
}

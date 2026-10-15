import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["admin", "editor"], default: "editor" },
    // Phase 18B: secure password reset.
    // Only a HASH of the reset token is persisted (never the raw token).
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    // Phase 18B: session/version counter for JWT invalidation.
    // Bumped on every successful password reset so previously issued JWTs no
    // longer authenticate. Default 0 keeps existing accounts/sessions working.
    authVersion: { type: Number, default: 0 },
    // Phase 22: Account lockout protection (5 failed attempts = 15-minute cool-down)
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    // Clerk user ID integration
    clerkUserId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Check if account is currently locked out
userSchema.methods.isLocked = function () {
  return Boolean(this.lockUntil && this.lockUntil > new Date());
};

// Invalidate every previously issued JWT for this user by advancing the auth
// version, then clear any pending reset token. Persists on the given doc.
userSchema.methods.bumpAuthVersion = async function () {
  this.authVersion = (this.authVersion || 0) + 1;
};

export default mongoose.model("User", userSchema);

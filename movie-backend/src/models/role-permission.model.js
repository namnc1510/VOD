const mongoose = require('mongoose');

const rolePermissionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    codes: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'role_permissions'
  }
);

const RolePermission =
  mongoose.models.RolePermission || mongoose.model('RolePermission', rolePermissionSchema);

module.exports = RolePermission;

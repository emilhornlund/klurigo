import {
  CRITTERS_V1_COLORS,
  CRITTERS_V1_PARTS,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'
import { Schema } from 'mongoose'

/** Whole-value avatar replacement; optional features retain explicit nulls. */
export const UserAvatarSchema = new Schema<CrittersAvatarConfigurationV1>(
  {
    version: { type: Number, enum: [1], required: true },
    style: { type: String, enum: ['critters'], required: true },
    artworkVersion: { type: String, enum: ['v1'], required: true },
    body: { type: String, enum: CRITTERS_V1_PARTS.body, required: true },
    top: { type: String, enum: [...CRITTERS_V1_PARTS.top, null] },
    eyes: { type: String, enum: CRITTERS_V1_PARTS.eyes, required: true },
    mouth: { type: String, enum: CRITTERS_V1_PARTS.mouth, required: true },
    pattern: { type: String, enum: [...CRITTERS_V1_PARTS.pattern, null] },
    cheeks: { type: String, enum: [...CRITTERS_V1_PARTS.cheeks, null] },
    bodyColor: { type: String, enum: CRITTERS_V1_COLORS.body, required: true },
    accentColor: {
      type: String,
      enum: CRITTERS_V1_COLORS.accent,
      required: true,
    },
    backgroundColor: {
      type: String,
      enum: CRITTERS_V1_COLORS.background,
      required: true,
    },
  },
  { _id: false },
)

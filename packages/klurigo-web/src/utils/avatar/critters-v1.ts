import { Avatar, Style } from '@dicebear/core'
import {
  CRITTERS_V1_COLORS,
  type CrittersAvatarConfigurationV1,
} from '@klurigo/common'

import definition from '../../assets/avatars/critters/v1/definition.json'

// Construct/validate the local style once, not once per thumbnail. No remote loader.
const style = new Style(definition)

/**
 * Render a complete v1 design with immutable visual defaults.
 * SVG IDs are isolated by the image data URI; never inline this SVG repeatedly.
 * Input must be a validated Klurigo configuration, not arbitrary renderer options.
 */
export function renderCrittersAvatarV1(
  config: CrittersAvatarConfigurationV1,
): string {
  return new Avatar(style, {
    seed: 'klurigo-critters-v1',
    idRandomization: false,
    flip: 'none',
    scale: 1,
    rotate: 0,
    translateX: 0,
    translateY: 0,
    borderRadius: 0,
    animationVariant: 'none',
    animationProbability: 100,
    inkColor: CRITTERS_V1_COLORS.ink,
    bodyColor: config.bodyColor,
    accentColor: config.accentColor,
    backgroundColor: config.backgroundColor,
    bodyVariant: config.body,
    bodyProbability: 100,
    eyesVariant: config.eyes,
    eyesProbability: 100,
    mouthVariant: config.mouth,
    mouthProbability: 100,
    topVariant: config.top ?? 'horns',
    topProbability: config.top === null ? 0 : 100,
    patternVariant: config.pattern ?? 'belly',
    patternProbability: config.pattern === null ? 0 : 100,
    cheeksVariant: config.cheeks ?? 'blush',
    cheeksProbability: config.cheeks === null ? 0 : 100,
  }).toString()
}

/** Encode the local SVG as a self-contained image, preserving its fragment IDs. */
export function getCrittersAvatarV1DataUri(
  config: CrittersAvatarConfigurationV1,
): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderCrittersAvatarV1(config))}`
}

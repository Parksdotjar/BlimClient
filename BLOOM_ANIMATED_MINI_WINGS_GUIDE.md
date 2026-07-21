# Bloom Animated Mini Wings — Blockbench Guide

This guide creates a two-part wing rig for Bloom Cosmetics. Each wing has a fixed inner root attached to the player's back and one outer section that flaps around a hinge.

## 1. Create the project

1. Open Blockbench and create a **Generic Model** project. A native **Java Block/Item `.bbmodel`** is also supported; keep the `.bbmodel` instead of exporting a flattened Minecraft JSON.
2. Use a power-of-two texture size such as **64×64**. Larger textures work, but 64×64 is a good starting point for small wings.
3. Keep the model centered around the Blockbench origin. The Cosmetic Manager will center and attach it to the player's torso.
4. Build the wings while looking at the player's back:
   - Negative X is the left wing.
   - Positive X is the right wing.
   - Keep the roots near X = 0.

## 2. Make this exact group structure

The names below are part of Bloom's animation format and must be exact:

```text
wing_center                 optional non-moving center decoration
left_wing_root              fixed left section near the back
left_wing_flap              moving outer left section
right_wing_root             fixed right section near the back
right_wing_flap             moving outer right section
```

The root and flap groups can contain as many cubes as needed. Only cubes inside `left_wing_flap` and `right_wing_flap` animate.

## 3. Set the hinges

1. Select `left_wing_flap` in the Outliner.
2. Select the blue folder row itself, not the cube inside it, then move the group's **origin/pivot** to the cut where the fixed root meets the moving flap.
3. Do not move the wing geometry while changing the origin. Use Blockbench's pivot/origin tool.
4. Repeat for `right_wing_flap`.
5. Keep both flap groups at **0°, 0°, 0° rotation** in the resting pose.
6. Place the two hinge origins symmetrically. For example, if the left hinge is X = -4, the right hinge should normally be X = 4.

The origin is the pin of the hinge. A misplaced origin makes the flap orbit around the wrong point.

## 4. Texture and UV

1. Create or import one PNG texture.
2. Apply UVs to every visible face.
3. Use nearest-neighbor/pixel-art painting; do not resize the PNG outside Blockbench after UV mapping.
4. Paint the left and right sides separately if the art is not symmetrical.
5. Save both the `.bbmodel` and the matching `.png`.

## 5. Preview and publish in Bloom Cosmetic Manager

1. Open **Wings → New wings**.
2. Select the `.bbmodel`, then its matching PNG.
3. Under Animation, choose **Flap**.
4. Confirm the green **Articulated hinges ready** status appears.
   - If it says whole-wing mode, at least one flap group is missing or named incorrectly.
5. Start with:
   - **Hinge axis:** `Y` for an Essentials-style back-and-forth motion
   - **Flap speed:** `0.8 cps`
   - **Flap range:** `18°`
6. Adjust the speed and range while watching the live mannequin preview.
7. Set the model offset and scale, then publish it normally.

## 6. In-game behavior

- The fixed root sections follow the player's torso without flapping.
- The two outer sections animate locally around their saved Blockbench pivots.
- The right side mirrors the left side automatically.
- Animation does not generate continuous backend traffic. The model, texture, and small animation settings are downloaded normally; every frame is calculated locally in Minecraft.
- Existing Bloom wings without named hinge groups continue using the original whole-wing flap behavior.

## Troubleshooting

### The entire wing moves

Check that the moving cubes are inside groups named exactly `left_wing_flap` and `right_wing_flap`.

### The flap circles around the body

The flap group's origin is in the wrong place. Move it to the physical cut between the root and flap without moving the cubes.

### One side moves backward

Keep both sides in a neutral zero-rotation resting pose. Bloom mirrors the animation direction automatically.

### The manager says whole-wing mode

Use the native `.bbmodel`, not a flattened Minecraft Java block/item JSON export. Bloom supports both Generic Model and Java Block/Item `.bbmodel` projects, including Blockbench files that store names in `groups` and cube membership in `outliner`; flattened exports discard that hierarchy and its hinge origins.

# Animated Bloom Cosmetics

Bloom Cosmetics supports two lightweight procedural animations on Fabric 1.21.11:

- **Spin** for hats and halos.
- **Flap** for wings.

The model and texture are downloaded only when the cosmetic changes. Animation then runs entirely on the player's computer, so it does not send requests every frame and adds essentially no ongoing backend load.

## Animated halo workflow

### 1. Build the halo in Blockbench

1. Create a **Generic Model** project.
2. Use cubes only and one PNG texture.
3. Build the ring around X=`0` and Z=`0`.
4. Keep the complete halo centered. Bloom rotates the entire normalized model around this center.
5. Save the project as `.bbmodel` and export its matching PNG texture.

You do not need to create a Blockbench animation. Bloom's manager and Fabric mod apply the continuous spin after importing the model.

### 2. Configure it in Bloom Cosmetics Manager

1. Open **3D Hats** and select **New hat**.
2. Choose the `.bbmodel` and its PNG.
3. Set the title, slug, collection, offsets, and scale.
4. In **Animation**, select **Spin**.
5. Set **Spin speed**. A good halo starting point is `0.45 rps`.
6. Inspect the live preview. Locking preview rotation only locks the camera; the halo continues spinning.
7. Publish the halo.

Suggested spin speeds:

| Style | Speed |
| --- | ---: |
| Slow magical halo | `0.20-0.35 rps` |
| Normal halo | `0.40-0.60 rps` |
| Fast energy ring | `0.75-1.10 rps` |

## Animated wing workflow

### 1. Build the wings in Blockbench

1. Create a **Generic Model** project.
2. Use cubes only and one PNG texture.
3. Center the complete model around X=`0`.
4. Put every left-wing cube on the negative-X side and every right-wing cube on the positive-X side.
5. Keep the roots of both wings close to X=`0`, where they meet the player's back.
6. A center connector may cross X=`0`; Bloom keeps center cubes still while both wing sides flap.
7. Save the project as `.bbmodel` and export its matching PNG.

Important: Bloom separates the wings by each cube's center X coordinate. Do not make one giant cube that contains both wings. Use separate cubes for the left and right sides.

### 2. Configure it in Bloom Cosmetics Manager

1. Open **3D Wings** and select **New wings**.
2. Choose the wing `.bbmodel` and PNG.
3. Adjust placement and scale against the full-body mannequin.
4. In **Animation**, select **Flap**.
5. Set **Flap speed** and **Flap range**.
6. Confirm the motion in the live preview, then publish.

Recommended starting values:

| Wing style | Speed | Range |
| --- | ---: | ---: |
| Large angel wings | `0.65 cps` | `12 degrees` |
| Normal wings | `1.15 cps` | `18 degrees` |
| Small energetic wings | `1.75 cps` | `24 degrees` |

If a wing does not move, its cubes are probably centered on X=`0`. Move the left and right geometry onto their respective sides and upload the corrected model.

## What gets saved

The manager writes a small animation section into the cosmetic's existing private model JSON:

```json
{
  "animation": {
    "type": "spin",
    "speed": 0.45
  }
}
```

or:

```json
{
  "animation": {
    "type": "flap",
    "speed": 1.15,
    "amplitude": 18
  }
}
```

The backend stores and serves this with the private model. The Fabric mod reads it once, caches the geometry and texture, and applies only inexpensive rotation transforms during rendering.

## Testing in Minecraft

1. Add and equip the cosmetic in Bloom Client.
2. Launch a Fabric 1.21.11 instance with Bloom Cosmetics 1.3.0 or newer.
3. Enter third-person view.
4. The selected halo should spin continuously, or the two wing sides should flap in opposite directions.
5. Equip another cosmetic in Bloom Client to verify the existing live refresh path.

Older cosmetics with no animation metadata remain static. To animate one, upload and publish a new version through the manager with **Spin** or **Flap** selected.

## Final model checklist

- [ ] Generic Model project
- [ ] Cubes only
- [ ] One matching PNG texture
- [ ] Halo centered on X/Z
- [ ] Wing sides made from separate cubes
- [ ] Left wing on negative X and right wing on positive X
- [ ] Manager preview placement matches the mannequin
- [ ] Animation mode selected
- [ ] Speed and flap range previewed before publishing
- [ ] Tested with Bloom Cosmetics 1.3.0 or newer

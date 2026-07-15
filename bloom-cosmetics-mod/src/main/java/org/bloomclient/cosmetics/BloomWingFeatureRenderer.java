package org.bloomclient.cosmetics;

import net.minecraft.client.render.RenderLayers;
import net.minecraft.client.render.command.OrderedRenderCommandQueue;
import net.minecraft.client.render.entity.feature.FeatureRenderer;
import net.minecraft.client.render.entity.feature.FeatureRendererContext;
import net.minecraft.client.render.entity.model.PlayerEntityModel;
import net.minecraft.client.render.entity.state.PlayerEntityRenderState;
import net.minecraft.client.util.math.MatrixStack;
import net.minecraft.util.math.RotationAxis;

public final class BloomWingFeatureRenderer extends FeatureRenderer<PlayerEntityRenderState, PlayerEntityModel> {
    public BloomWingFeatureRenderer(FeatureRendererContext<PlayerEntityRenderState, PlayerEntityModel> context) {
        super(context);
    }

    @Override
    public void render(MatrixStack matrices, OrderedRenderCommandQueue queue, int light, PlayerEntityRenderState state, float limbAngle, float limbDistance) {
        BloomWingService.WingAsset asset = BloomWingService.get().assetFor(state.id);
        if (asset == null) return;
        matrices.push();
        getContextModel().getRootPart().applyTransform(matrices);
        getContextModel().body.applyTransform(matrices);
        matrices.translate(asset.offsetX() / 16.0f, asset.offsetY() / 16.0f, asset.offsetZ() / 16.0f);
        matrices.scale(asset.scale(), asset.scale(), asset.scale());
        BloomHatMesh.Animation animation = asset.mesh().animation();
        if (animation.type() != BloomHatMesh.AnimationType.FLAP) {
            queue.submitCustom(matrices, RenderLayers.entityCutoutNoCull(asset.texture()),
                (entry, consumer) -> asset.mesh().render(entry, consumer, light));
            matrices.pop();
            return;
        }

        float angle = (float) Math.sin(System.nanoTime() * 1.0e-9 * animation.speed() * Math.PI * 2.0) * animation.amplitude();
        if (asset.mesh().hasWingCenter()) {
            queue.submitCustom(matrices, RenderLayers.entityCutoutNoCull(asset.texture()),
                (entry, consumer) -> asset.mesh().renderWingCenter(entry, consumer, light));
        }
        if (asset.mesh().hasWingLeft()) {
            matrices.push();
            matrices.translate(0.0f, 6.0f / 16.0f, 0.0f);
            matrices.multiply(RotationAxis.POSITIVE_Z.rotationDegrees(angle));
            matrices.translate(0.0f, -6.0f / 16.0f, 0.0f);
            queue.submitCustom(matrices, RenderLayers.entityCutoutNoCull(asset.texture()),
                (entry, consumer) -> asset.mesh().renderWingLeft(entry, consumer, light));
            matrices.pop();
        }
        if (asset.mesh().hasWingRight()) {
            matrices.push();
            matrices.translate(0.0f, 6.0f / 16.0f, 0.0f);
            matrices.multiply(RotationAxis.POSITIVE_Z.rotationDegrees(-angle));
            matrices.translate(0.0f, -6.0f / 16.0f, 0.0f);
            queue.submitCustom(matrices, RenderLayers.entityCutoutNoCull(asset.texture()),
                (entry, consumer) -> asset.mesh().renderWingRight(entry, consumer, light));
            matrices.pop();
        }
        matrices.pop();
    }
}

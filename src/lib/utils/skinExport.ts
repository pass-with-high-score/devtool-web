import JSZip from 'jszip';
import { XMLBuilder } from 'fast-xml-parser';
import { SkinData, AnimationItem } from '@/lib/types/skin';

export async function exportSkinToZip(skinData: SkinData): Promise<Blob> {
    const zip = new JSZip();

    // Generate skin.xml
    const xmlContent = generateSkinXml(skinData);
    zip.file('skin.xml', xmlContent);

    // Add all assets
    for (const asset of skinData.assets) {
        const base64Data = asset.dataUrl.split(',')[1];
        if (base64Data) {
            zip.file(asset.filename, base64Data, { base64: true });
        }
    }

    return zip.generateAsync({ type: 'blob' });
}

function generateSkinXml(skinData: SkinData): string {
    const { metadata, params, states } = skinData;

    // Build motion elements
    const motions = states.map(state => {
        const motionAttrs: Record<string, string> = {
            '@_state': state.state,
        };

        // Only add boolean attributes if they are truthy
        // Use Boolean() to handle any edge cases from various data sources
        if (Boolean(state.checkMove)) motionAttrs['@_checkMove'] = 'true';
        if (Boolean(state.checkWall)) motionAttrs['@_checkWall'] = 'true';
        if (state.nextState) motionAttrs['@_nextState'] = state.nextState;

        const children = buildAnimationItems(state.items);

        return {
            ...motionAttrs,
            ...children,
        };
    });
    // Ensure preview has proper extension by finding matching asset
    let previewValue = metadata.preview;
    if (previewValue && !previewValue.match(/\.(png|jpg|jpeg|gif)$/i)) {
        // Try to find matching asset with extension
        const matchingAsset = skinData.assets.find(asset =>
            asset.filename.replace(/\.(png|jpg|jpeg|gif)$/i, '') === previewValue
        );
        if (matchingAsset) {
            previewValue = matchingAsset.filename;
        }
    }

    const xmlObj = {
        '?xml': { '@_version': '1.0', '@_encoding': 'utf-8' },
        'motion-params': {
            '@_package': metadata.package,
            '@_name': metadata.name,
            '@_author': metadata.author,
            '@_preview': previewValue,
            '@_acceleration': params.acceleration,
            '@_maxVelocity': params.maxVelocity,
            '@_deaccelerationDistance': params.deaccelerationDistance,
            '@_proximityDistance': params.proximityDistance,
            '@_initialState': params.initialState,
            '@_awakeState': params.awakeState,
            '@_moveStatePrefix': params.moveStatePrefix,
            '@_wallStatePrefix': params.wallStatePrefix,
            motion: motions,
        },
    };

    const builder = new XMLBuilder({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        format: true,
        indentBy: '    ',
        suppressEmptyNode: true,
        suppressBooleanAttributes: false,
    });

    return builder.build(xmlObj);
}

function buildAnimationItems(items: AnimationItem[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const simpleItems: Record<string, unknown>[] = [];
    const repeatItems: Record<string, unknown>[] = [];

    for (const item of items) {
        if (item.type === 'item') {
            simpleItems.push({
                '@_drawable': item.drawable,
                '@_duration': item.duration,
            });
        } else if (item.type === 'repeat-item') {
            const repeatAttrs: Record<string, unknown> = {};
            if (item.repeatCount !== undefined) {
                repeatAttrs['@_repeatCount'] = item.repeatCount;
            }
            const nestedChildren = buildAnimationItems(item.items || []);
            repeatItems.push({
                ...repeatAttrs,
                ...nestedChildren,
            });
        }
    }

    if (simpleItems.length > 0) {
        result['item'] = simpleItems;
    }
    if (repeatItems.length > 0) {
        result['repeat-item'] = repeatItems;
    }

    return result;
}

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

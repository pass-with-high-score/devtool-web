import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import {
    SkinData,
    SkinMetadata,
    MotionParams,
    MotionState,
    AnimationItem,
    Asset,
    DEFAULT_METADATA,
    DEFAULT_MOTION_PARAMS,
} from '@/lib/types/skin';

export async function importSkinFromZip(file: File): Promise<SkinData> {
    const zip = await JSZip.loadAsync(file);

    // Find skin.xml at any path level (handles nested folder structures from macOS Compress)
    let skinXmlFile: JSZip.JSZipObject | null = null;
    let basePath = '';

    for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (path.endsWith('skin.xml') && !zipEntry.dir) {
            skinXmlFile = zipEntry;
            // Extract the base path (e.g., "folder/" from "folder/skin.xml")
            basePath = path.replace('skin.xml', '');
            break;
        }
    }

    if (!skinXmlFile) {
        throw new Error('Invalid skin: skin.xml not found');
    }

    const xmlContent = await skinXmlFile.async('string');
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        allowBooleanAttributes: true,
        parseAttributeValue: true,
        isArray: (name) => name === 'motion' || name === 'item' || name === 'repeat-item',
    });

    const parsed = parser.parse(xmlContent);
    const motionParams = parsed['motion-params'];

    if (!motionParams) {
        throw new Error('Invalid skin.xml: motion-params not found');
    }

    // Parse metadata
    const metadata: SkinMetadata = {
        name: motionParams['@_name'] || DEFAULT_METADATA.name,
        author: motionParams['@_author'] || DEFAULT_METADATA.author,
        package: motionParams['@_package'] || DEFAULT_METADATA.package,
        preview: String(motionParams['@_preview'] || DEFAULT_METADATA.preview),
    };

    // Parse motion params
    const params: MotionParams = {
        acceleration: Number(motionParams['@_acceleration']) || DEFAULT_MOTION_PARAMS.acceleration,
        maxVelocity: Number(motionParams['@_maxVelocity']) || DEFAULT_MOTION_PARAMS.maxVelocity,
        deaccelerationDistance: Number(motionParams['@_deaccelerationDistance']) || DEFAULT_MOTION_PARAMS.deaccelerationDistance,
        proximityDistance: Number(motionParams['@_proximityDistance']) || DEFAULT_MOTION_PARAMS.proximityDistance,
        initialState: motionParams['@_initialState'] || DEFAULT_MOTION_PARAMS.initialState,
        awakeState: motionParams['@_awakeState'] || DEFAULT_MOTION_PARAMS.awakeState,
        moveStatePrefix: motionParams['@_moveStatePrefix'] || DEFAULT_MOTION_PARAMS.moveStatePrefix,
        wallStatePrefix: motionParams['@_wallStatePrefix'] || DEFAULT_MOTION_PARAMS.wallStatePrefix,
    };

    // Parse motion states
    const states: MotionState[] = [];
    const motions = motionParams.motion || [];

    for (const motion of motions) {
        const state: MotionState = {
            state: motion['@_state'] || '',
            checkMove: motion['@_checkMove'] === true || motion['@_checkMove'] === 'true',
            checkWall: motion['@_checkWall'] === true || motion['@_checkWall'] === 'true',
            nextState: motion['@_nextState'] || undefined,
            items: parseAnimationItems(motion),
        };
        states.push(state);
    }

    // Load assets - look in the same folder as skin.xml
    const assets: Asset[] = [];
    const imageFiles = Object.keys(zip.files).filter(name => {
        // Match images at the same level as skin.xml or in any folder
        const isImage = /\.(png|jpg|jpeg|gif)$/i.test(name);
        const isInSameFolder = name.startsWith(basePath);
        const isNotNested = !name.slice(basePath.length).includes('/'); // No further subdirectories
        return isImage && isInSameFolder && isNotNested;
    });

    for (const fullPath of imageFiles) {
        const imageFile = zip.file(fullPath);
        if (imageFile) {
            const blob = await imageFile.async('blob');
            const dataUrl = await blobToDataUrl(blob);
            // Extract just the filename from the full path
            const filename = fullPath.slice(basePath.length);
            assets.push({
                id: crypto.randomUUID(),
                filename,
                dataUrl,
            });
        }
    }

    return { metadata, params, states, assets };
}

function parseAnimationItems(motion: Record<string, unknown>): AnimationItem[] {
    const items: AnimationItem[] = [];

    // Get all child elements in order
    const rawItems = (motion['item'] || []) as unknown[];
    const rawRepeatItems = (motion['repeat-item'] || []) as unknown[];

    // Process regular items
    for (const item of rawItems) {
        if (typeof item === 'object' && item !== null) {
            items.push({
                type: 'item',
                drawable: String((item as Record<string, unknown>)['@_drawable'] || ''),
                duration: Number((item as Record<string, unknown>)['@_duration']) || 250,
            });
        }
    }

    // Process repeat items
    for (const repeatItem of rawRepeatItems) {
        if (typeof repeatItem === 'object' && repeatItem !== null) {
            const repeat = repeatItem as Record<string, unknown>;
            const nestedItems = parseAnimationItems(repeat);
            items.push({
                type: 'repeat-item',
                repeatCount: Number(repeat['@_repeatCount']) || undefined,
                items: nestedItems,
            });
        }
    }

    return items;
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Keeps a typical phone photo comfortably under the backend's ~300KB cap
 *  (see ImageUrlValidation.Validate on the API) after base64 encoding. */
const CHAT_IMAGE_MAX_EDGE = 960;
const CHAT_IMAGE_QUALITY = 0.6;

/**
 * Opens the photo library and returns the picked image's local file URI, or `null` if the
 * user cancelled or denied the permission.
 */
export async function pickChatImage(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  return result.assets[0].uri;
}

/** Resizes + JPEG-compresses a local image URI into a `data:image/jpeg;base64,...` string. */
export async function compressChatImage(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  const rendered = await context.resize({ width: CHAT_IMAGE_MAX_EDGE }).renderAsync();
  const saved = await rendered.saveAsync({ compress: CHAT_IMAGE_QUALITY, format: SaveFormat.JPEG, base64: true });
  if (!saved.base64) throw new Error('Could not process image');
  return `data:image/jpeg;base64,${saved.base64}`;
}

/** Pick + compress in one step — the composer's whole "attach" flow. */
export async function pickAndCompressChatImage(): Promise<string | null> {
  const uri = await pickChatImage();
  if (!uri) return null;
  return compressChatImage(uri);
}

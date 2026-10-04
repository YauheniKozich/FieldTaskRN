import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Attachment, AttachmentType } from '../../types';

function id(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function copyAttachment(
  taskId: string,
  sourceUri: string,
  fileName: string,
  mimeType: string | null,
  type: AttachmentType,
): Attachment {
  const directory = new Directory(Paths.document, 'task-attachments');
  directory.create({ idempotent: true, intermediates: true });
  const safeName = fileName.replace(/[\\/:*?"<>|]/g, '_');
  const storedName = `${id()}-${safeName}`;
  const destination = new File(directory, storedName);
  new File(sourceUri).copy(destination);
  return {
    id: id(),
    taskId,
    type,
    localUri: destination.uri,
    fileName,
    mimeType,
    createdAt: new Date().toISOString(),
  };
}

export async function chooseMedia(taskId: string): Promise<Attachment[]> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      'Photo and video access was not granted. Enable media access in device settings to attach a file.',
    );
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    allowsMultipleSelection: true,
    quality: 0.85,
  });
  if (result.canceled) return [];
  const copied: Attachment[] = [];
  try {
    for (const asset of result.assets) {
      if (!asset.type || (asset.type !== 'image' && asset.type !== 'video')) continue;
      const type: AttachmentType = asset.type;
      const fallback = type === 'image' ? `image-${id()}.jpg` : `video-${id()}.mp4`;
      copied.push(
        copyAttachment(taskId, asset.uri, asset.fileName ?? fallback, asset.mimeType ?? null, type),
      );
    }
    return copied;
  } catch (error) {
    for (const attachment of copied) removeAttachmentFile(attachment.localUri);
    throw error;
  }
}

export async function chooseDocuments(taskId: string): Promise<Attachment[]> {
  const result = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  const copied: Attachment[] = [];
  try {
    for (const asset of result.assets) {
      copied.push(
        copyAttachment(taskId, asset.uri, asset.name, asset.mimeType ?? null, 'document'),
      );
    }
    return copied;
  } catch (error) {
    for (const attachment of copied) removeAttachmentFile(attachment.localUri);
    throw error;
  }
}

export function attachmentExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

export function removeAttachmentFile(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    /* Metadata removal still succeeds when a local file is already unavailable. */
  }
}

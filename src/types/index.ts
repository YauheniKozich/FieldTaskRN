export type TaskStatus='new'|'in_progress'|'completed'|'cancelled';
export type SyncStatus='pending'|'synced'|'failed';
export type Task={id:string;title:string;description:string;dueAt:string;location:string;latitude:number|null;longitude:number|null;status:TaskStatus;createdAt:string;updatedAt:string;syncStatus:SyncStatus;deletedAt:string|null;notificationId:string|null;reminderVersion?:string|null};
export type AttachmentType='image'|'video'|'document';
export type Attachment={id:string;taskId:string;type:AttachmentType;localUri:string;fileName:string;mimeType:string|null;createdAt:string};
export type HistoryEntry={id:string;taskId:string|null;action:string;description:string;createdAt:string};
export type TaskInput=Pick<Task,'title'|'description'|'dueAt'|'location'|'latitude'|'longitude'|'status'>;

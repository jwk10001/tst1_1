export type MobileSaveType = "MANUAL" | "AUTO" | "RESTORE";

export type MobileDiary = {
  id: string;
  title: string;
  content: string;
  contentFormat: "markdown";
  latestVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type MobileDiaryVersion = {
  id: string;
  diaryId: string;
  parentVersionId: string | null;
  versionNumber: number;
  saveType: MobileSaveType;
  titleSnapshot: string;
  contentSnapshot: string;
  contentFormat: "markdown";
  contentHash: string;
  message: string | null;
  baseVersionId: string | null;
  restoredFromVersionId: string | null;
  createdAt: string;
};

export type MobileDiaryRepository = {
  createDiary(input: { title: string; content: string; contentFormat: "markdown" }): Promise<MobileDiary>;
  listDiaries(): Promise<MobileDiary[]>;
  getDiary(diaryId: string): Promise<MobileDiary | null>;
  getVersion(diaryId: string, versionId: string): Promise<MobileDiaryVersion | null>;
  listVersions(diaryId: string, filters?: { saveType?: MobileSaveType }): Promise<MobileDiaryVersion[]>;
  insertVersion(version: MobileDiaryVersion): Promise<void>;
  updateDiaryAfterSave(input: {
    diaryId: string;
    title: string;
    content: string;
    contentFormat: "markdown";
    latestVersionId: string;
    updatedAt: string;
  }): Promise<void>;
};

export type MobileHashFunction = (input: { title: string; content: string; contentFormat: "markdown" }) => Promise<string>;

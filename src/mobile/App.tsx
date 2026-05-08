import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createMobileDiaryService } from "./diaryService";
import { createSQLiteDiaryRepository, initializeMobileDatabase } from "./db";
import { hashMobileDiaryContent } from "./hash";
import type { MobileDiary, MobileDiaryVersion } from "./types";

type Screen =
  | { name: "list" }
  | { name: "editor"; diaryId: string }
  | { name: "history"; diaryId: string }
  | { name: "snapshot"; diaryId: string; versionId: string };

type SaveStatus = "saved" | "dirty" | "saving" | "failed";

export function MobileDiaryApp() {
  const service = useMemo(() => createMobileDiaryService(createSQLiteDiaryRepository(), hashMobileDiaryContent), []);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>({ name: "list" });

  useEffect(() => {
    void initializeMobileDatabase().then(() => setReady(true));
  }, []);

  if (!ready) {
    return <CenteredText text="正在初始化日记数据库..." />;
  }

  if (screen.name === "editor") {
    return <EditorScreen diaryId={screen.diaryId} service={service} onBack={() => setScreen({ name: "list" })} onHistory={() => setScreen({ name: "history", diaryId: screen.diaryId })} />;
  }

  if (screen.name === "history") {
    return <HistoryScreen diaryId={screen.diaryId} service={service} onBack={() => setScreen({ name: "editor", diaryId: screen.diaryId })} onOpen={(versionId) => setScreen({ name: "snapshot", diaryId: screen.diaryId, versionId })} />;
  }

  if (screen.name === "snapshot") {
    return <SnapshotScreen diaryId={screen.diaryId} versionId={screen.versionId} service={service} onBack={() => setScreen({ name: "history", diaryId: screen.diaryId })} onRestored={() => setScreen({ name: "editor", diaryId: screen.diaryId })} />;
  }

  return <ListScreen service={service} onOpen={(diaryId) => setScreen({ name: "editor", diaryId })} />;
}

type MobileService = ReturnType<typeof createMobileDiaryService>;

function ListScreen({ service, onOpen }: { service: MobileService; onOpen: (diaryId: string) => void }) {
  const [diaries, setDiaries] = useState<MobileDiary[]>([]);

  const load = useCallback(async () => {
    setDiaries(await service.listDiaries());
  }, [service]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createDiary() {
    const diary = await service.createDiary({ title: "Untitled diary", content: "" });
    onOpen(diary.id);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>本地优先 iOS 日记</Text>
          <Text style={styles.title}>日记</Text>
        </View>
        <Button title="新建" onPress={() => void createDiary()} />
      </View>
      <FlatList
        data={diaries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.muted}>还没有日记，点“新建”开始记录。</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onOpen(item.id)}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text numberOfLines={2} style={styles.preview}>{item.content || "空白日记"}</Text>
            <Text style={styles.muted}>{formatDate(item.updatedAt)}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function EditorScreen({ diaryId, service, onBack, onHistory }: { diaryId: string; service: MobileService; onBack: () => void; onHistory: () => void }) {
  const [diary, setDiary] = useState<MobileDiary | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [baseVersionId, setBaseVersionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const statusRef = useRef(status);
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const messageRef = useRef(message);
  const baseVersionRef = useRef(baseVersionId);

  useEffect(() => {
    statusRef.current = status;
    titleRef.current = title;
    contentRef.current = content;
    messageRef.current = message;
    baseVersionRef.current = baseVersionId;
  }, [status, title, content, message, baseVersionId]);

  const load = useCallback(async () => {
    const nextDiary = await service.getDiary(diaryId);
    if (!nextDiary) return;
    setDiary(nextDiary);
    setTitle(nextDiary.title);
    setContent(nextDiary.content);
    setBaseVersionId(nextDiary.latestVersionId);
    setStatus("saved");
  }, [diaryId, service]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async (saveType: "MANUAL" | "AUTO") => {
    if (statusRef.current === "saving") return;
    setStatus("saving");

    try {
      const result = await service.saveDiaryVersion({
        diaryId,
        title: titleRef.current,
        content: contentRef.current,
        contentFormat: "markdown",
        saveType,
        baseVersionId: baseVersionRef.current,
        message: saveType === "MANUAL" ? messageRef.current.trim() || null : null,
      });

      if (result.version?.id) {
        setBaseVersionId(result.version.id);
      }
      if (saveType === "MANUAL") {
        setMessage("");
      }
      setLastSavedAt(new Date().toISOString());
      setStatus("saved");
    } catch {
      setStatus("failed");
    }
  }, [diaryId, service]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (statusRef.current === "dirty" || statusRef.current === "failed") {
        void save("AUTO");
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [save]);

  function markDirty() {
    setStatus("dirty");
  }

  if (!diary) {
    return <CenteredText text="正在加载日记..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="返回" secondary onPress={onBack} />
        <View style={styles.headerActions}>
          <Button title="历史" secondary onPress={onHistory} />
          <Button title={status === "saving" ? "保存中" : "保存"} onPress={() => void save("MANUAL")} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.status}>{statusLabel(status, lastSavedAt)}</Text>
        <TextInput style={styles.input} value={title} onChangeText={(value) => { setTitle(value); markDirty(); }} placeholder="标题" />
        <TextInput style={styles.input} value={message} onChangeText={setMessage} placeholder="保存说明（可选）" maxLength={500} />
        <TextInput
          style={[styles.input, styles.textarea]}
          value={content}
          onChangeText={(value) => { setContent(value); markDirty(); }}
          placeholder="用 Markdown 记录今天..."
          multiline
          textAlignVertical="top"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function HistoryScreen({ diaryId, service, onBack, onOpen }: { diaryId: string; service: MobileService; onBack: () => void; onOpen: (versionId: string) => void }) {
  const [versions, setVersions] = useState<MobileDiaryVersion[]>([]);

  useEffect(() => {
    void service.listVersions(diaryId).then(setVersions);
  }, [diaryId, service]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="返回编辑" secondary onPress={onBack} />
        <Text style={styles.title}>历史版本</Text>
      </View>
      <FlatList
        data={versions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onOpen(item.id)}>
            <Text style={styles.cardTitle}>#{item.versionNumber} · {item.saveType}</Text>
            <Text style={styles.preview}>{item.titleSnapshot}</Text>
            <Text style={styles.muted}>{item.message ?? "无说明"} · {formatDate(item.createdAt)}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function SnapshotScreen({ diaryId, versionId, service, onBack, onRestored }: { diaryId: string; versionId: string; service: MobileService; onBack: () => void; onRestored: () => void }) {
  const [version, setVersion] = useState<MobileDiaryVersion | null>(null);
  const [diff, setDiff] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const selected = await service.getVersion(diaryId, versionId);
      setVersion(selected);
      if (!selected?.parentVersionId) return;
      const versionDiff = await service.getVersionDiff(diaryId, selected.parentVersionId, selected.id);
      setDiff(versionDiff.contentDiff.filter((chunk) => chunk.type !== "unchanged").map((chunk) => `${chunk.type === "added" ? "+" : "-"} ${chunk.text.trimEnd()}`));
    }

    void load();
  }, [diaryId, service, versionId]);

  async function restore() {
    await service.restoreVersion({ diaryId, versionId });
    Alert.alert("已恢复", "恢复会创建一个新的 RESTORE 版本。", [{ text: "好", onPress: onRestored }]);
  }

  if (!version) {
    return <CenteredText text="正在加载版本..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Button title="返回历史" secondary onPress={onBack} />
        <Button title="恢复" onPress={() => void restore()} />
      </View>
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.title}>#{version.versionNumber} · {version.saveType}</Text>
        <Text style={styles.cardTitle}>{version.titleSnapshot}</Text>
        <Text style={styles.snapshot}>{version.contentSnapshot || "空白日记"}</Text>
        <Text style={styles.cardTitle}>与父版本差异</Text>
        {diff.length ? diff.map((line, index) => <Text key={`${line}-${index}`} style={line.startsWith("+") ? styles.added : styles.removed}>{line}</Text>) : <Text style={styles.muted}>没有可显示的差异。</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

function Button({ title, onPress, secondary = false }: { title: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable style={[styles.button, secondary ? styles.secondaryButton : null]} onPress={onPress}>
      <Text style={[styles.buttonText, secondary ? styles.secondaryButtonText : null]}>{title}</Text>
    </Pressable>
  );
}

function CenteredText({ text }: { text: string }) {
  return (
    <SafeAreaView style={[styles.container, styles.centered]}>
      <Text style={styles.muted}>{text}</Text>
    </SafeAreaView>
  );
}

function statusLabel(status: SaveStatus, lastSavedAt: string | null) {
  if (status === "dirty") return "有未保存修改，10 秒后自动保存";
  if (status === "saving") return "正在保存...";
  if (status === "failed") return "保存失败，将继续自动重试";
  return lastSavedAt ? `已保存 · ${formatDate(lastSavedAt)}` : "已保存";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centered: { alignItems: "center", justifyContent: "center" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", padding: 20, gap: 12 },
  headerActions: { flexDirection: "row", gap: 8 },
  eyebrow: { color: "#64748b", fontSize: 13, marginBottom: 4 },
  title: { color: "#0f172a", fontSize: 28, fontWeight: "700" },
  list: { padding: 20, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 18, shadowColor: "#0f172a", shadowOpacity: 0.08, shadowRadius: 12 },
  cardTitle: { color: "#0f172a", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  preview: { color: "#334155", fontSize: 15, lineHeight: 22, marginBottom: 12 },
  muted: { color: "#64748b", fontSize: 14 },
  button: { backgroundColor: "#2563eb", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  secondaryButton: { backgroundColor: "#e2e8f0" },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondaryButtonText: { color: "#0f172a" },
  form: { gap: 14, padding: 20 },
  status: { color: "#2563eb", fontSize: 14, fontWeight: "600" },
  input: { backgroundColor: "#fff", borderColor: "#cbd5e1", borderRadius: 14, borderWidth: 1, color: "#0f172a", fontSize: 16, padding: 14 },
  textarea: { minHeight: 320 },
  snapshot: { backgroundColor: "#fff", borderRadius: 16, color: "#0f172a", fontSize: 16, lineHeight: 24, padding: 16 },
  added: { backgroundColor: "#dcfce7", color: "#166534", fontFamily: "Menlo", padding: 6 },
  removed: { backgroundColor: "#fee2e2", color: "#991b1b", fontFamily: "Menlo", padding: 6 },
});

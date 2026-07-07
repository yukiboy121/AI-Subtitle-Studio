import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  real,
  serial,
} from "drizzle-orm/pg-core";

// ── Users ──
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  avatar: text("avatar"),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Projects ──
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  status: varchar("status", { length: 50 }).notNull().default("created"),
  language: varchar("language", { length: 50 }),
  isFavorite: boolean("is_favorite").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  editorSettings: jsonb("editor_settings"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Videos ──
export const videos = pgTable("videos", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 500 }).notNull(),
  originalName: varchar("original_name", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  size: integer("size"),
  duration: real("duration"),
  width: integer("width"),
  height: integer("height"),
  path: text("path").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Audio ──
export const audioFiles = pgTable("audio_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 500 }).notNull(),
  path: text("path").notNull(),
  duration: real("duration"),
  waveformData: jsonb("waveform_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Subtitle Tracks ──
export const subtitleTracks = pgTable("subtitle_tracks", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull().default("Default"),
  language: varchar("language", { length: 50 }).notNull().default("en"),
  isDefault: boolean("is_default").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Subtitles ──
export const subtitles = pgTable("subtitles", {
  id: uuid("id").primaryKey().defaultRandom(),
  trackId: uuid("track_id").notNull().references(() => subtitleTracks.id, { onDelete: "cascade" }),
  index: integer("index").notNull(),
  startTime: real("start_time").notNull(),
  endTime: real("end_time").notNull(),
  text: text("text").notNull(),
  speaker: varchar("speaker", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Subtitle Styles ──
export const subtitleStyles = pgTable("subtitle_styles", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull().default("Default"),
  fontFamily: varchar("font_family", { length: 100 }).notNull().default("Arial"),
  fontSize: integer("font_size").notNull().default(24),
  fontWeight: varchar("font_weight", { length: 20 }).notNull().default("normal"),
  fontStyle: varchar("font_style", { length: 20 }).notNull().default("normal"),
  textDecoration: varchar("text_decoration", { length: 50 }).notNull().default("none"),
  textTransform: varchar("text_transform", { length: 20 }).notNull().default("none"),
  textColor: varchar("text_color", { length: 20 }).notNull().default("#FFFFFF"),
  backgroundColor: varchar("background_color", { length: 20 }).notNull().default("transparent"),
  backgroundOpacity: real("background_opacity").notNull().default(0),
  outlineColor: varchar("outline_color", { length: 20 }).notNull().default("#000000"),
  outlineWidth: integer("outline_width").notNull().default(2),
  shadowColor: varchar("shadow_color", { length: 20 }),
  shadowBlur: integer("shadow_blur"),
  positionX: real("position_x").notNull().default(50),
  positionY: real("position_y").notNull().default(90),
  alignment: varchar("alignment", { length: 20 }).notNull().default("center"),
  animation: varchar("animation", { length: 50 }).notNull().default("none"),
  letterSpacing: real("letter_spacing").notNull().default(0),
  lineHeight: real("line_height").notNull().default(1.4),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── Backups ──
export const backups = pgTable("backups", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  version: serial("version"),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ── User Settings ──
export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  theme: varchar("theme", { length: 20 }).notNull().default("dark"),
  language: varchar("language", { length: 10 }).notNull().default("en"),
  autoSave: boolean("auto_save").notNull().default(true),
  autoSaveInterval: integer("auto_save_interval").notNull().default(5),
  keyboardShortcuts: jsonb("keyboard_shortcuts"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
